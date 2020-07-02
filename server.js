/* eslint-disable no-tabs */
const fs = require('fs');
const bodyParser = require('body-parser');
const jsonServer = require('json-server');
const jwt = require('jsonwebtoken');

const server = jsonServer.create();
let userdb = JSON.parse(fs.readFileSync('./users.json', 'UTF-8'));

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(jsonServer.defaults());

const SECRET_KEY = '987612345';

const expiresIn = '12h';

function createToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET_KEY, (err, decode) => (decode !== undefined ? decode : err));
}

function isAuthenticated({ username, password }) {
  return (
    userdb.users.findIndex((user) => user.username === username && user.password === password)
		!== -1
  );
}

server.post('/auth/register', (req, res) => {
  console.log('POST register');
  console.log(req.body);
  const {
    name, username, email, password,
  } = req.body;

  if (isAuthenticated({ username, password }) === true) {
    const status = 401;
    const message = 'Username já foi utilizado!';
    res.status(status).json({ status, message });
    return;
  }

  fs.readFile('./users.json', (err, data) => {
    if (err) {
      const status = 401;
      const message = err;
      res.status(status).json({ status, message });
      return;
    }

    const itens = JSON.parse(data.toString());

    const lastItemId = itens.users.length > 0 ? itens.users[itens.users.length - 1].id : 0;

    itens.users.push({
      id: lastItemId + 1,
      name,
      username,
      email,
      password,
    });
    fs.writeFile('./users.json', JSON.stringify(itens), (Err) => {
      if (Err) {
        const status = 401;
        const message = err;
        res.status(status).json({ status, message });
      }
    });
    userdb = itens;
  });

  const accessToken = createToken({ username, password });
  console.log(`Access Token:${accessToken}`);
  res.status(200).json({ accessToken });
});

server.post('/auth/login', (req, res) => {
  console.log('login endpoint called; request body: AQUI');
  console.log(req.body);
  const { username, password } = req.body;
  if (isAuthenticated({ username, password }) === false) {
    const status = 401;
    const message = 'Username ou password incorretos!';
    res.status(status).json({ status, message });
    return;
  }
  const accessToken = createToken({ username, password });
  const user = {
    ...userdb.users.find((item) => item.username === username && item.password === password),
  };
  delete user.password;
  console.log(`Access Token: ${accessToken}`);
  res.status(200).json({ accessToken, user });
});

server.use(/^(?!\/auth).*$/, (req, res, next) => {
  if (
    req.headers.authorization === undefined
		|| req.headers.authorization.split(' ')[0] !== 'Bearer'
  ) {
    const status = 401;
    const message = 'Token inválido';
    res.status(status).json({ status, message });
    return;
  }
  try {
    const verifyTokenResult = verifyToken(req.headers.authorization.split(' ')[1]);

    if (verifyTokenResult instanceof Error) {
      const status = 401;
      const message = 'Token de autenticação não encontrado';
      res.status(status).json({ status, message });
      return;
    }
    next();
  } catch (err) {
    const status = 401;
    const message = 'Token revogado';
    res.status(status).json({ status, message });
  }
});

server.listen(8000, () => {
  console.log('ouvindo na porta 8000...');
});
