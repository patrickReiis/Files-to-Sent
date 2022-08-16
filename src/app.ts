const http = require('http')

const port = process.env.PORT || 3000

const server = http.createServer((req:any, res:any) => {
  res.writeHead(200, {'Content-Type':'text/html'})
  res.end('Hello, World!')
})

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})