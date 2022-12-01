const express = require('express')
const axios = require('axios')
const ytdl = require('youtube-dl-exec')
const stream = require('./youtube-stream')
//const vidDetails = require('./vidDetails')
//import {apiKey} from './api.js'
const apiKeyObj = require('./api.json')
const apiKey = apiKeyObj.apiKey
const fs = require('fs')
const app = express()
const port = 3000
const baseApiUrl = "https://www.googleapis.com/youtube/v3"
const MAX_RESULTS = 10

app.use('/media', express.static('media'));// mount a folder to /media
app.set("view engine", "ejs");

/*
  Add option to continue playing (like radio)
  add option to loop, shuffle
  add support for playlists https://www.googleapis.com/youtube/v3/playlistItems?id=playlistid&key=[YOUR_API_KEY]
  ask youtube for added quota
  add check for if the id is of a stream (a current one or a previous one), and make it not download the video
  add option to show video as well with the audio
  add the ability to check until when the link is available, and then preset to the user that he needs to refresh once that time arrives
*/

app.get('/', (req, res) => {
  res.redirect('/search');
});


async function getVidDetailsById(videoId)
{
  const apiRequestUrl = `${baseApiUrl}/videos?key=${apiKey}&part=snippet&id=${videoId}`;
  const response = await axios.get(apiRequestUrl);
  return response.data.items[0].snippet;
}

function disassembleResponseToJson(responseJson)
{
  const filteredItems = responseJson.filter(item => item.snippet);
  console.log(Object.keys(filteredItems));
  const titles = filteredItems.map(item => item.snippet?.title);
  const urls = filteredItems.map(item => `https://www.youtube.com/watch?v=${item.id.videoId}`);
  const thumbnails = filteredItems.map(item => item.snippet.thumbnails.high.url);
  const ids = filteredItems.map(item => item.id.videoId);
  var preview = {video: ids.map((id, i) =>  {return {title: titles[i], thumbnail: thumbnails[i], url: urls[i], id: id}})}; // {video: [{title: "", etc..}]}
  return JSON.stringify(preview);
}

async function getDurationByVidId(videoId)
{
  const apiRequestUrl = `${baseApiUrl}/videos?key=${apiKey}&part=contentDetails&id=${videoId}`;
  const response = await axios.get(apiRequestUrl);
  return response.data.items[0].contentDetails.duration;
}


app.get('/search', async (req, res, next) => {
  try{
    const searchQuery = encodeURIComponent(req.query.search_query);
    const apiRequestUrl = `${baseApiUrl}/search?key=${apiKey}&type=video&part=snippet&q=${searchQuery}&maxResults=${MAX_RESULTS}`;
    console.log(apiRequestUrl);
    const response = await axios.get(apiRequestUrl);
    var preview = disassembleResponseToJson(response.data.items);
    //TEST
    /*console.log("preview", preview)
    var previewJson = JSON.parse(preview)
    console.log("parsed preview: ", JSON.stringify(previewJson))*/
    //TEST END
    //res.send(titles)
    //res.send(response.data.items)
    
    res.render("index", {responseJSON: response.data.items, preview: preview, maxResults: MAX_RESULTS});
  }
  catch(err){
    next(err);
  }
});

app.get('/play', async (req, res, next) => {
  try{
    const videoQuery = req.query.v;
    const vidUrl = `https://www.youtube.com/watch?v=${videoQuery}`;
    const apiRequestUrl = `${baseApiUrl}/search?key=${apiKey}&type=video&part=snippet&relatedToVideoId=${videoQuery}&maxResults=${MAX_RESULTS}`;
    console.log("api request: ", apiRequestUrl);
    const response = await axios.get(apiRequestUrl);
    //console.log("available keys: ", Object.keys(response['data']['items']));
    var recommendPreview = disassembleResponseToJson(response.data.items);
    
    //get vid duration
    const duration = await getDurationByVidId(videoQuery);
    
    var vidDetails = await getVidDetailsById(videoQuery);

    console.log(duration);
    console.log(vidDetails);
    var streamUrls = await ytdl(vidUrl, {
      getUrl: true,
      youtubeSkipDashManifest: true
    });//dymanically update the page
    
    streamUrls = streamUrls.split("\n");
    videoStreamUrl = streamUrls[0];
    audioStreamUrl = streamUrls[1];

    // fs.writeFile("./example.txt", streamUrls, function (err) {
    //   if (err) return console.log(err);
    //   console.log('Data > example.txt');
    // });
    console.log("video: ", videoStreamUrl);
    console.log("audio: ", audioStreamUrl);

    res.render("play", {videoQuery: videoQuery, videoDetails: vidDetails, preview: recommendPreview, audioUrl: audioStreamUrl, videoUrl: videoStreamUrl});
  }
  catch(err){
    next(err);
  }
});

app.get('/audio', async (req, res) => {
  try {
      const videoQuery = req.query.v;
      const vidUrl = `https://www.youtube.com/watch?v=${videoQuery}`;
      const videoPath = `./media/${videoQuery}.ogg`;
      const webmVideoPath = `./media/${videoQuery}.webm`;
      const webmPartVideoPath = `./media/${videoQuery}.webm.part`;

      if( !fs.existsSync(webmVideoPath) && !fs.existsSync(webmPartVideoPath) && !fs.existsSync(videoPath)) { // check if the file exists without accessing it
        ytdl(vidUrl, {
          extractAudio: true,
          audioFormat: "vorbis",
          output: "./media/%(id)s.%(ext)s",
          downloadArchive: "./media/vids-downloaded.txt"
        });
      }//check if when opening a page, waiting for webm.part to download, then opening another page it crashes


      if(fs.existsSync(videoPath) && !fs.existsSync(webmVideoPath) && !fs.existsSync(webmPartVideoPath)) {
        const videoStream = fs.createReadStream(videoPath);
        videoStream.pipe(res);
      } else {
        for await (const chunk of stream(vidUrl)) {
          res.write(chunk)
          }
          res.end()
      }
  } catch (err) {
      console.error(err)
      if (!res.headersSent) {
      res.writeHead(500)
      res.end('internal system error') 
      }
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});