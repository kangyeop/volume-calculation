import { ChatOpenAI, ChatOpenAIFields } from '@langchain/openai';

export function createLLM(params: ChatOpenAIFields): ChatOpenAI {
  const { model = 'gpt-5.4-nano', ...fields } = params;
  return new ChatOpenAI(model, { reasoning: { effort: 'none' }, ...fields });
}
