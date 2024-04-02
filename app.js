const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'userData.db')
let db = null

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`db Error ${e.message}`)
  }
}
initializeDbAndServer()

app.post('/register/', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  const hashedPassword = await bcrypt.hash(password, 10)

  const selectUserQuery = `
        SELECT 
            *
        FROM 
            user
        WHERE username = '${username}';
    `
  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    if (password.length >= 5) {
      const createUserQuery = `
                INSERT INTO 
                    user(username, name, password, gender, location)
                VALUES(
                    '${username}',
                    '${name}',
                    '${hashedPassword}',
                    '${gender}',
                    '${location}'
                );
            `
      await db.run(createUserQuery)
      response.send('User created successfully')
    } else {
      response.status(400)
      response.send('Password is too short')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

app.post('/login/', async (request, response) => {
  const {username, password} = request.body

  const selectUserQuery = `
    SELECT
      *
    FROM
      user
    WHERE
      username = '${username}';
  `
  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      response.send('Login success!')
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

app.put('/change-password/', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body

  const getUserQuery = `
    SELECT
      * 
    FROM 
      user
    WHERE
      username = '${username}';
  `
  const dbUser = await db.get(getUserQuery)

  if (newPassword.length < 5) {
    response.status(400)
    response.send('Password is too short')
  } else {
    const isPasswordMatch = await bcrypt.compare(oldPassword, dbUser.password)
    if (isPasswordMatch === true) {
      const newHashedPassword = await bcrypt.hash(newPassword, 10)
      const changePasswordQuery = `
        UPDATE user
        SET password = '${newHashedPassword}'
        WHERE username = '${username}';
      `
      await db.run(changePasswordQuery)
      response.send('Password Updated')
    } else {
      response.status(400)
      response.send('Invalid current password')
    }
  }
})
