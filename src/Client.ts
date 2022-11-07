import { IncomingMessage } from 'node:http';
import { request as httpsRequest, RequestOptions } from 'node:https';
import Chat from './Chat';

export default class CharacterAI {
  private token?: string;

  public async authenticate(accessToken: string): Promise<void> {
    const { body } = await this.request(
      'https://beta.character.ai/dj-rest-auth/auth0/',
      JSON.stringify({ access_token: accessToken }),
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    );

    this.token = JSON.parse(body.toString()).key;
    if (!this.token) throw new Error('Failed to authenticate');
  }

  public async fetchCategories(): Promise<Category[]> {
    const { body } = await this.request(
      'https://beta.character.ai/chat/character/categories/',
      undefined,
      { method: 'GET' }
    );

    const categories = JSON.parse(body.toString());

    if (!Array.isArray(categories))
      throw new Error('Received invalid data from API');

    return categories;
  }

  public async fetchUserConfig(): Promise<UserConfig> {
    const { body } = await this.request(
      'https://beta.character.ai/chat/config/',
      undefined,
      { method: 'GET', headers: this.getHeaders() }
    );

    return JSON.parse(body.toString()).config;
  }

  public async fetchUser(): Promise<User> {
    const { body } = await this.request(
      'https://beta.character.ai/chat/user/',
      undefined,
      { method: 'GET', headers: this.getHeaders() }
    );

    return JSON.parse(body.toString()).user;
  }

  public async fetchFeatured(): Promise<FeaturedCharacter[]> {
    const { body } = await this.request(
      'https://beta.character.ai/chat/characters/featured/',
      undefined,
      { method: 'GET', headers: this.getHeaders() }
    );

    return JSON.parse(body.toString()).featured_characters;
  }

  public async fetchCharactersByCategories(
    curated = false
  ): Promise<CharactersByCategory> {
    const url = `https://beta.character.ai/chat/${
      curated ? 'curated_categories' : 'categories'
    }/characters/`;

    const { body } = await this.request(url, undefined, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const property = curated
      ? 'characters_by_curated_category'
      : 'characters_by_category';

    return JSON.parse(body.toString())[property];
  }

  public async fetchCharaterInfo(characterId: string): Promise<CharacterInfo> {
    const { body } = await this.request(
      'https://beta.character.ai/chat/character/info/',
      JSON.stringify({ external_id: characterId }),
      { method: 'POST', headers: this.getHeaders() }
    );

    return JSON.parse(body.toString()).character;
  }

  public async continueOrCreateChat(characterId: string): Promise<Chat> {
    let { body } = await this.request(
      'https://beta.character.ai/chat/history/continue/',
      JSON.stringify({
        character_external_id: characterId,
        history_external_id: null,
      }),
      { method: 'POST', headers: this.getHeaders() }
    );

    let input = JSON.parse(body.toString());

    if (input.status === 'No Such History') {
      const { body } = await this.request(
        'https://beta.character.ai/chat/history/create/',
        JSON.stringify({
          character_external_id: characterId,
          history_external_id: null,
        }),
        { method: 'POST', headers: this.getHeaders() }
      );

      input = JSON.parse(body.toString());
    }

    return new Chat(this, characterId, input);
  }

  public getHeaders(headers: any = {}, contentType = 'application/json') {
    return {
      ...headers,
      'Content-Type': contentType,
      Authorization: `Token ${this.token}`,
    };
  }

  public request(
    url: string,
    body?: any,
    options?: RequestOptions
  ): Promise<{ body: Buffer; response: IncomingMessage }> {
    return new Promise((resolve, reject) => {
      let data: Buffer[] = [];

      const req = httpsRequest(url, options, (res) => {
        res.on('data', (chunk) => {
          if (!(chunk instanceof Buffer)) chunk = Buffer.from(chunk);

          data.push(chunk);
        });

        res.on('close', () => {
          resolve({ body: Buffer.concat(data), response: res });
        });
      });

      req.on('error', reject);

      if (body) req.write(body);

      req.end();
    });
  }
}

interface Category {
  name: string;
  description: string;
}

interface UserConfig {
  public: boolean;
  trending_carousel_index: 4;
  waitlist: boolean;
}

interface User {
  is_human: boolean;
  name: string;
  user: {
    acccount: {
      avatar_file_name: string;
      avatar_type: 'DEFAULT' | 'UPLOADED';
      name: string;
      onboarding_complete: boolean;
    } | null;
    first_name: string;
    id: number;
    is_staff: boolean;
    username: string;
  };
}

interface FeaturedCharacter {
  characters: string[];
  name: string;
}

interface Character {
  avatar_file_name: string;
  copyable: boolean;
  external_id: string;
  greeting: string;
  participant__name: string;
  participant__num_interactions: string;
  title: string;
  user__username: string;
}

type CharactersByCategory = {
  [key: string]: Character[];
};

interface CharacterInfo {
  avatar_file_name: string;
  base_img_prompt: string;
  copyable: boolean;
  description: string;
  external_id: string;
  greeting: string;
  identifier: string;
  img_gen_enabled: boolean;
  img_prompt_regex: string;
  name: string;
  participant__name: string;
  participant__user__username: string;
  songs: unknown[];
  strip_img_prompt_from_msg: boolean;
  title: string;
  user__username: string;
  visibility: 'PUBLIC' | string;
}
