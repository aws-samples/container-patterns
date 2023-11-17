const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World!')
  res.status(200).json
})

app.listen(port, () => {
  console.log(`Access your application at`, `http://localhost:${port}`)
})

module.exports = app