import CharacterAI from './Client';

export class Test {
  public static async sendMessage(message: string): Promise<void> {
    const characterAi = new CharacterAI();
    await characterAi.authenticate(process.env.CHARACTERAI_TOKEN);

    const chat = await characterAi.continueOrCreateChat(
      process.env.CHARACTERAI_CHARID,
    );

    const response = await chat.sendAndAwaitResponse({
      message,
      singleReply: true,
    });

    console.log(response);
  }
}

Test.sendMessage('Greetings! What are your plans for today?');
