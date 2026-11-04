const https = require('https');

https.get('https://www.youtube.com/shorts/1GpyOA5SdAE', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9'
  }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const titleMatch = data.match(/<title>([^<]+)<\/title>/);
    console.log('Title:', titleMatch ? titleMatch[1] : 'No title');

    const descMatch = data.match(/"shortDescription":"([^"]+)"/);
    console.log('Short description:', descMatch ? descMatch[1] : 'No desc');

    const authorMatch = data.match(/"author":"([^"]+)"/);
    console.log('Author:', authorMatch ? authorMatch[1] : 'No author');

    const channelIdMatch = data.match(/"channelId":"([^"]+)"/);
    console.log('ChannelId:', channelIdMatch ? channelIdMatch[1] : 'No channelId');

    const kwMatch = data.match(/"keywords":(\[[^\]]+\])/);
    console.log('Keywords:', kwMatch ? kwMatch[1] : 'No kw');
  });
}).on('error', console.error);
