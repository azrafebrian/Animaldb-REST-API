const express = require('express');
const app = express(); 

app.get('/', (req, res) => { 
  res.send('Welcome to animaldb-api, an API for animal database!');
}) 

app.listen(3000, () => console.log("Running on http://localhost:3000"))

const Sequelize = require('sequelize');
const sequelize = new Sequelize('animaldb_api', 'root', null, {
    host: 'localhost',
    dialect: 'mysql',
    pool: {
        max: 5,
        min: 0,
        idle: 10000
    }
});

const animals = sequelize.define('animals', {
    'id': {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    'name': Sequelize.STRING,
    'scientific': Sequelize.STRING,
    'location': Sequelize.STRING,
    'image': {
        type: Sequelize.STRING,
        get(){
            const image = this.getDataValue('image');
            return "/img/"+image;
        }
    },  
}, {
    freezeTableName: true,
    timestamps: false,
})

//Get all animals data.
app.get('/animals/', (req, res) => {
    animals.findAll().then(animals => {
        res.json(animals)
    })
  })

//Get an animal by id.
app.get('/animals/:id', (req, res) => {
    animals.findOne({where: {id: req.params.id}}).then(animals => {
        res.json(animals)
    })
  })

const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator/check');
const { matchedData, sanitize } = require('express-validator/filter');
const multer  = require('multer');
const path = require('path');
const crypto = require('crypto');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));
const uploadDir = '/img/';
const storage = multer.diskStorage({
    destination: "./public"+uploadDir,
    filename: function (req, file, cb) {
      crypto.pseudoRandomBytes(16, function (err, raw) {
        if (err) return cb(err)  
        cb(null, raw.toString('hex') + path.extname(file.originalname))
      })
    }
})

const upload = multer({storage: storage, dest: uploadDir });

//Post an animal.
app.post('/animals/', [
    upload.single('image'),

    check('name')
        .isLength({min: 2}),
    check('scientific')
        .isLength({min: 2}),
    check('location')
        .isLength({min: 2}),

],(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.mapped() });
    }

    animals.create({
        name: req.body.name,
        scientific: req.body.scientific,
        location: req.body.location,
        image: req.file === undefined ? "" : req.file.filename
    }).then(newAnimals => {
        res.json({
            "status":"success",
            "message":"Animal added",
            "data": newAnimals
        })
    })
})

//Update an animal data.
app.put('/animals/:id', [
    upload.single('image'),

    check('id')
        .isLength({ min: 1 })
        .isNumeric()
        .custom(value => {
            return animals.findOne({where: {id: value}}).then(b => {
                if(!b){
                    throw new Error('id not found');
                }            
            })
        }
    ),
    check('name')
        .isLength({min: 2}),
    check('scientific')
        .isLength({min: 2}),
    check('location')
        .isLength({min: 2}),

],(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.mapped() });
    }
    const update = {
        name: req.body.name,
        scientific: req.body.scientific,
        location: req.body.location,
        image: req.file === undefined ? "" : req.file.filename
    }
    animals.update(update,{where: {id: req.params.id}})
        .then(affectedRow => {
            return animals.findOne({where: {id: req.params.id}})      
        })
        .then(b => {
            res.json({
                "status": "success",
                "message": "Animal updated",
                "data": b
            })
        })
})

//Delete an animal data.
app.delete('/animals/:id',[

    check('id')
        .isLength({ min: 1 })
        .isNumeric()
        .custom(value => {
            return animals.findOne({where: {id: value}}).then(b => {
                if(!b){
                    throw new Error('id not found');
                }            
            })
        }
    ),

], (req, res) => {
    animals.destroy({where: {id: req.params.id}})
        .then(affectedRow => {
            if(affectedRow){
                return {
                    "status":"success",
                    "message": "Animal deleted",
                    "data": null
                } 
            }

            return {
                "status":"error",
                "message": "Failed",
                "data": null
            } 
                
        })
        .then(r => {
            res.json(r)
        })
})