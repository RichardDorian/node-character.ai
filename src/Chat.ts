import type CharacterAI from './Client';

export default class Chat {
  public characterId: string;
  public externalId: string;
  public aiId: string;

  private client: CharacterAI;

  public constructor(
    client: CharacterAI,
    characterId: string,
    continueBody: any
  ) {
    this.characterId = characterId;
    this.externalId = continueBody.external_id;

    this.client = client;

    const ai = continueBody.participants.find(
      (participant) => participant.is_human === false
    );
    this.aiId = ai.user.username;
  }

  public async fetchHistory(): Promise<MessageHistory> {
    const { body } = await this.client.request(
      `https://beta.character.ai/chat/history/msgs/user/?history_external_id=${this.externalId}`,
      undefined,
      { method: 'GET', headers: this.client.getHeaders() }
    );

    return JSON.parse(body.toString());
  }

  public async sendAndAwaitResponse(message: string): Promise<ChatReply[]> {
    const payload = {
      history_external_id: this.externalId,
      character_external_id: this.characterId,
      text: message,
      tgt: this.aiId,
      ranking_method: 'random',
      faux_chat: false,
      staging: false,
      model_server_address: null,
      override_prefix: null,
      override_rank: null,
      rank_candidates: null,
      filter_candidates: null,
      prefix_limit: null,
      prefix_token_limit: null,
      livetune_coeff: null,
      stream_params: null,
      enable_tti: true,
      initial_timeout: null,
      insert_beginning: null,
      translate_candidates: null,
      stream_every_n_steps: 16,
      chunks_to_pad: 8,
      is_proactive: false,
    };

    const { body } = await this.client.request(
      `https://beta.character.ai/chat/streaming/`,
      JSON.stringify(payload),
      { method: 'POST', headers: this.client.getHeaders() }
    );

    const replies: ChatReply[] = [];

    for (const line of body.toString().split('\n')) {
      if (line.startsWith('{')) {
        replies.push(JSON.parse(line));
        continue;
      }

      const start = line.indexOf(' {');
      if (start < 0) continue;
      replies.push(JSON.parse(line.slice(start - 1)));
    }

    return replies;
  }
}

interface MessageHistory {
  has_more: boolean;
  messages: {
    id: number;
    image_prompt_text: string;
    image_rel_path: string;
    is_alternative: boolean;
    responsible_user__username: string | null;
    src__character__avatar_file_name: string | null;
    src__is_human: string;
    src__name: string;
    src_char: {
      avatar_file_name: string | null;
      participant: {
        name: string;
      };
    };
    text: string;
  }[];
  next_page: number;
}

interface ChatReply {
  replies: {
    text: string;
  }[];
  src_char: {
    participant: {
      name: string;
      avatar_file_name: string;
    };
  };
  is_final_chunk: boolean;
}
