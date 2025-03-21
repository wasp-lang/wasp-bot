declare module "inspirational-quotes" {
  export default {
    getQuote: () => ({ text: string, author: string }),
    getRandomQuote: () => string,
  };
}
