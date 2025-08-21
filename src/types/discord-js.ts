import ExternalDiscord from "discord.js";

declare module "discord.js" {
  export type GuildMessage = ExternalDiscord.Message<true>;
}
