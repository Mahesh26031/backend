const express= require('express');
const bodyparser=require('body-parser')
const bcrypt=require('bcrypt-nodejs')
const cors=require('cors')
const knex=require('knex');
const Clarifai=require('clarifai');


const a = new Clarifai.App({
    apiKey :'7ea6a72cb9af4b179c82ca661a9a6cf0'
  });

 
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0; 
 const db=knex({
    client: 'pg',
    connection: {
      connectionString : process.env.DATABASE_URL,
      ssl: true
    }
  });


const app=express();

app.use(bodyparser.json());
app.use(cors())



app.get('/',(req,res)=>{
    res.send('hi')
})

app.post('/signin',(req,res)=>{
    if(!req.body.email || !req.body.password) {
        return res.status(400).json('incorrect from submission');
     }
    
    db.select('email','hash').from('login')
    .where('email', '=', req.body.email)
    .then(data=>{
        const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
        if (isValid) {
            return db.select('*').from('users')
              .where('email', '=', req.body.email)
              .then(user => {
                res.json(user[0])
              })
              .catch(err => res.status(400).json('unable to get user'))
        }   else {
            res.status(400).json('wrong credentials')
          }    

    })
    .catch(err => res.status(400).json('wrong credentials'))
        

})

app.post('/register',(req,res)=>{
    const { email, firstname, password } = req.body;
    if(!email || !firstname || !password) {
       return res.status(400).json('incorrect from submission');
    }
  const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
      trx.insert({
        hash: hash,
        email: email
      })
      .into('login')
      .returning('email')
      .then(loginEmail => {
        return trx('users')
          .returning('*')
          .insert({
            email: loginEmail[0].email,
            firstname: firstname,
            joined: new Date()
          })
          .then(user => {
            res.json(user[0]);
          })
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('unable to register'))
  
    

    
        

})

app.get('/profile/:id',(req,res)=>{
    db.select('*').from('users').where({
        id: req.params.id
    }).then(
        user=>{
            if(user.length){
            res.json(user[0])
        }else{
            res.status(400).json('not found')

        }
        }
    ).catch(err=>res.status(400).json('error'))


})

app.put('/image',(req,res)=>{
    db('users').where({
        id: req.body.id
    }).increment('entries',1)
    .returning('entries')
    .then(entries=>{res.json(entries[0].entries)})
    .catch(err=>res.status(400).json('error occured in entries'))
})

app.post('/imageURL',(req,res)=>{
    a.models.predict(Clarifai.FACE_DETECT_MODEL,req.body.input)
    .then(data=>{
        res.json(data)
    })
    .catch(err=>res.status(400).json('unable to connect clarifai'))

})   



app.listen(process.env.PORT || 3000,()=>{
  console.log(`app is running ${process.env.PORT}`)
})