import Quote from "inspirational-quotes";
import _ from "lodash";

interface Quote {
  text: string;
  author: string;
}

export function generateDailyQuote(): string {
  const wisdomQuote = Quote.getQuote();
  const waspQuote = _.sample(WASP_QUOTES)!;
  const quote = Math.random() < 0.1 ? waspQuote : wisdomQuote;

  return formatQuote(quote);
}

const WASP_QUOTES: Quote[] = [
  {
    text: "No hour of life is wasted that is spent in the saddle.",
    author: "Vince",
  },
  {
    text: "Food nourishes the body, but meetings nourish the soul.",
    author: "Filip",
  },
  { text: "Shirt is just a social construct.", author: "Miho" },
  {
    text: "Don't be too dogmatic, unless we're talking about Dogma the beer brewery.",
    author: "Milica, wannabe home brewer",
  },
  {
    text: "Let's send them some swag! Martin will take care of it.",
    author: "Matija",
  },
  {
    text: "I don't have time to review PRs but it seems I do have time to implement these silly quotes.",
    author: "Martin",
  },
];

function formatQuote(quote: Quote): string {
  return `${quote.text} | ${quote.author}`;
}
