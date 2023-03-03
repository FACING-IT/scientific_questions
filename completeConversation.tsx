import fetch from 'isomorphic-fetch'

const getOpenAiAPiKey = () => 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

type Paper = {
  id: string
  similarity_score: number
  title: string
  abstract: string
  authors: string
}

// generates an input for chat-gpt model "messages" field
const answerQuestionAboutPhysics = (
  question: string, // user input
  papers: Array<Paper> // list of relevant scientific papers
) => [
  {
    role: 'user',
    content:
      'Answer the question as truthfully as possible using the provided research papers. Provide references when possible.' +
      '\n\nPapers' +
      papers
        .filter(it => it.similarity_score > 0.4)
        .map(
          it =>
            '- ' +
            '\ntitle : ' +
            it.title +
            '\nauthors : ' +
            it.authors +
            '\nabstract : ' +
            it.abstract
        )
        .join('\n\n\n\n\n') +
      ' Question: ' +
      question
  }
]

// finds relevant scientific papers in https://docsearch.redisventures.com
const findPapersAboutPhysics = async (text: string): Promise<Array<Paper>> =>
  fetch(
    'https://docsearch.redisventures.com/api/v1/paper/vectorsearch/text/user',
    {
      credentials: 'omit',
      headers: {
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Content-Type': 'application/json',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache'
      },
      referrer: 'https://docsearch.redisventures.com/',
      body: JSON.stringify({
        user_text: text,
        provider: 'openai',
        search_type: 'KNN',
        number_of_results: 5,
        years: [],
        categories: []
      }),
      method: 'POST',
      mode: 'cors'
    }
  )
    .then(it => it.json())
    .then(it => it.papers)

export const completeConversation = async (message: string) => {
  // first relevant papers
  const papers = await findPapersAboutPhysics(message)

  // then ask o
  const data = {
    messages: answerQuestionAboutPhysics(message, papers),
    model: 'gpt-3.5-turbo'
  }

  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAiAPiKey()}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then(it => it.json())
    .then(it => {
      const text = (it as any).choices?.[0]?.message.content.trim()
      return text
    })
}
