const express = require("express");
const path = require("path");
const bcrypt = require('bcrypt');
const jwt=require("jsonwebtoken")


const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

const dbPath = path.join(__dirname, "mydb.db");
app.use(express.json())

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.get("/", async (request,response)=> {
  response.send("hiiiiiii")
})

app.post("/users/", async (request, response) => {
  const { username, name, password, age, number } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO 
        user (username, name, password, age, number) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${age}',
          '${number}'
        )`;
    const dbResponse = await db.run(createUserQuery);
    const newUserId = dbResponse.lastID;
    response.send(`Created new user with ${newUserId}`);
  } else {
    response.status = 400;
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload={
        username:username
      }
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send(jwtToken)
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

// getting details api 

app.get("/details/",async (request,response)=> {
  let jwtToken
  const authHeader=request.headers["authorization"]
  if (authHeader!==undefined) {
    jwtToken=authHeader.split(" ")[1]
  }if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid Access Tokens");
  } else {
    jwt.verify(jwtToken,"MY_SECRET_TOKEN", async(error,payload)=> {
      if (error) {
        response.send("Invalid Access Token")
      }else {
        const getBooksQuery = `
            SELECT
              *
            FROM
             player`;
        const booksArray = await db.all(getBooksQuery);
        response.send(booksArray);
      }
    })
  }
})