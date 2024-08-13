import { ClientType, Innertube, Utils as YTTools } from 'youtubei.js';

let done = false;
const id = '-xQQzi0IdLY';

async function run() {
  const yt = await Innertube.create({
    client_type: ClientType.TV_EMBEDDED,
    generate_session_locally: false,
    enable_session_cache: false,
    retrieve_player: true
  });
  console.log('stream created');
  const stream = await yt.download(id, {
    type: 'video',
    quality: 'best',
    format: 'mp4',
    client: 'TV_EMBEDDED',
  });

  try {
    let chunks = 0;
  
    // need to wait on the write to ensure the file is completely ready
    for await (const chunk of YTTools.streamToIterable(stream)) {
      chunks += chunk.length;
      console.log(`${chunks} bytes`);
    }
    console.log(`completed ${chunks}`);
    done = true;
  } catch(err) {
    console.error(err);
    done = true;
  }

}

(async () => {
  console.log('running');
  await run();
  
  console.log('done');
})();