const fs = require('fs')
const bodyParser = require('body-parser')
const jsonServer = require('json-server')
const jwt = require('jsonwebtoken')

const server = jsonServer.create()
let userdb = JSON.parse(fs.readFileSync('./users.json', 'UTF-8'))

server.use(bodyParser.urlencoded({extended: true}))
server.use(bodyParser.json())
server.use(jsonServer.defaults())

const SECRET_KEY = '987612345'

const expiresIn = '12h'

function createToken(payload){
  return jwt.sign(payload, SECRET_KEY, {expiresIn})
}

function verifyToken(token){
  return  jwt.verify(token, SECRET_KEY, (err, decode) => decode !== undefined ?  decode : err)
}

function isAuthenticated({username, password}){
  return userdb.users.findIndex(user => user.username === username && user.password === password) !== -1
}

server.post('/auth/register', (req, res) => {
  console.log('POST register');
  console.log(req.body);
  const { name, username, email, password} = req.body;

  if(isAuthenticated({username, password}) === true) {
    const status = 401;
    const message = 'Username já foi utilizado!';
    res.status(status).json({status, message});
    return
  }

  fs.readFile("./users.json", (err, data) => {  
    if (err) {
      const status = 401
      const message = err
      res.status(status).json({status, message})
      return
    };

    var data = JSON.parse(data.toString());

    var last_item_id = data.users.length > 0 ? data.users[data.users.length-1].id : 0;

    data.users.push({id: last_item_id + 1, name, username, email, password});
    var writeData = fs.writeFile("./users.json", JSON.stringify(data), (err, result) => {
        if (err) {
          const status = 401
          const message = err
          res.status(status).json({status, message})
          return
        }
    });
    userdb = data
  });

  const access_token = createToken({username, password})
  console.log("Access Token:" + access_token);
  res.status(200).json({access_token})
})

server.post('/auth/login', (req, res) => {
  console.log("login endpoint called; request body:");
  console.log(req.body);
  const {username, password} = req.body;
  if (isAuthenticated({username, password}) === false) {
    const status = 401
    const message = 'Username ou password incorretos!'
    res.status(status).json({status, message})
    return
  }
  const access_token = createToken({username, password})
  let user = { ...userdb.users.find(user => user.username === username && user.password === password) }
  delete user.password
  console.log("Access Token: " + access_token);
  res.status(200).json({access_token, user})
})

server.use(/^(?!\/auth).*$/,  (req, res, next) => {
  if (req.headers.authorization === undefined || req.headers.authorization.split(' ')[0] !== 'Bearer') {
    const status = 401
    const message = 'Token inválido'
    res.status(status).json({status, message})
    return
  }
  try {
    let verifyTokenResult;
     verifyTokenResult = verifyToken(req.headers.authorization.split(' ')[1]);

     if (verifyTokenResult instanceof Error) {
       const status = 401
       const message = 'Token de autenticação não encontrado'
       res.status(status).json({status, message})
       return
     }
     next()
  } catch (err) {
    const status = 401
    const message = 'Token revogado'
    res.status(status).json({status, message})
  }
})

server.listen(8000, () => {
  console.log('ouvindo na porta 8000...')
})