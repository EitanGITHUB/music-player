const express = require('express')
const axios = require('axios')
const ytdl = require('youtube-dl-exec')
const app = express()
const port = 3000
//need to add own apiKey
const baseApiUrl = "https://www.googleapis.com/youtube/v3"
const MAX_RESULTS = 10

app.use('/media', express.static('media'))// mount a folder to /media
app.set("view engine", "ejs")

app.get('/', (req, res) => {
  res.send('main page')
})


app.get('/search', async (req, res, next) => {
  try{
    const searchQuery = req.query.search_query
    const url = `${baseApiUrl}/search?key=${apiKey}&type=video&part=snippet&q=${searchQuery}&maxResults=` + MAX_RESULTS
    console.log(url)//TEST
    const response = await axios.get(url)
    const titles = response.data.items.map(item => item.snippet.title)
    const ids = response.data.items.map(item => item.id.videoId)
    const urls = response.data.items.map(item => `https://www.youtube.com/watch?v=${item.id.videoId}`)
    const thumbnails = response.data.items.map(item => item.snippet.thumbnails.high.url)
    var preview = '{ "Video": [';
    for(var i = 0; i < titles.length; i++)
    {
      preview += `{"Title": "${titles[i]}", "Thumbnail": "${thumbnails[i]}", "Url": "${urls[i]}"}`
      if(i + 1 != titles.length)
      {
        preview += ","
      }
      else
      {
        preview += "]}"
      }
    }
    //TEST
    console.log("preview", preview)
    var previewJson = JSON.parse(preview)
    console.log("parsed preview: ", JSON.stringify(previewJson))
    //TEST END
    //res.send(titles)
    //res.send(response.data.items)
    ytdl(urls[0], {
      extractAudio: true,
      audioFormat: "vorbis",
      output: "./media/%(id)s.%(ext)s",
      noVideo: true
    })
    res.render("index", {videoTitles: JSON.stringify(titles), videoUrls: urls, videoThumbnails: thumbnails, responseJSON: response.data.items, preview: preview, maxResults: MAX_RESULTS})
  }
  catch(err){
    next(err)
  }
})


app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})