import { Message } from 'discord.js';
import sharp from 'sharp';
import got from 'got';
import fs from 'fs';
import { ICommand } from '../../icommand';
import { extractFromOptions } from '../../common';
import { TickerTracker } from '../../services/tickerTracker';

const tickerAlias = new Map([
  ['/rusty', '/er2'],
  ['/rty', '/er2'],
  ['/cum', '/cl'],
]);

const getTicker = (name: string): string => {
  const normalizedName = name.toLowerCase();

  const ticker = tickerAlias.get(normalizedName);
  if (ticker) {
    return ticker;
  }
  return name;
};

export const updateText = (imgUrl: string, msg: Message): void => {
  const sharpStream = sharp({
    failOnError: false,
  });

  const promises = [];

  promises.push(
    sharpStream
      .clone()
      .composite([{ input: 'yup.png', gravity: 'northwest' }])
      .toFile('temp.png'),
  );

  got.stream(imgUrl).pipe(sharpStream);

  Promise.all(promises)
    .then(() => {
      msg.channel
        .send(
          {
            files: ['temp.png'],
          },
        ).then(() => fs.unlinkSync('temp.png'));
    })
    .catch((err) => {
      console.error("Error processing files, let's clean it up", err);
      fs.unlinkSync('temp.png');
    });
};

export const FuturesCommand: ICommand = {
  name: 'Futures',
  helpDescription: '$/es will draw es chart',
  showInHelp: true,
  trigger: (msg: Message) => msg.content.startsWith('$/'),
  command: async (message: Message) => {
    let ticker = message.content.toLowerCase().split(' ')[0].substring(1);
    const ogTicker = ticker;
    const rawOptions = message.content.toLowerCase().split(ticker)[1].substring(1).split(' ');
    const options = [];
    for (let i = 0; i < rawOptions.length; i++) options.push(rawOptions[i]);
    const timePeriod = extractFromOptions('time_period_futures', options);
    TickerTracker.postTicker(ticker, message.author.id, 'future');

    ticker = getTicker(ticker);
    const file = `https://elite.finviz.com/fut_chart.ashx?t=${
      ticker
    }&p=${
      timePeriod
    }&f=1`
      + `x=${Math.random()}.png`;

    if (ogTicker === '/cum') {
      return updateText(file, message);
    }
    const image = await got(file);
    const sentMessage = await message.channel
      .send(
        {
          files: [
            image.rawBody,
          ],
        },
      );

    TickerTracker.lastTicker(message.author.id, message.id, (sentMessage as Message).id);
    return Promise.resolve();
  },
};
