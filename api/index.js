const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// Conexión a MongoDB Atlas
mongoose.connect('mongodb+srv://omarcontreras:Omar151003@omarcontreras.g6y4rxx.mongodb.net/plage', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Conectado a MongoDB Atlas');
}).catch((error) => {
  console.error('Error al conectar a MongoDB Atlas:', error);
});

const userSchema = new mongoose.Schema({
  userId: String,
  displayName: String,
  robots: []
});

const robotSchema = new mongoose.Schema({
  code: String,
  Rname: String,
  waste: Number,
  location: {
    x: Number,
    y: Number
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});


// Creación de los modelos de usuarios y robots
const User = mongoose.model('User', userSchema);
const Robot = mongoose.model('Robot', robotSchema);


// Creación de la aplicación Express
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Endpoint para obtener toda la información de los robots de un usuario
app.get('/api/users/:userId/robots', async (req, res) => {
  const { userId } = req.params;
  Robot.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "code",
        foreignField: "robots.code",
        as: "user"
      }
    },
    {
      $match: {
        "user.userId": userId
      }
    },
    {
      $project: {
        "_id": 0,
        "Rname": 1,
        "location": 1,
        "waste": 1
      }
    }
  ])
  .then(result => {
    res.json(result);
  })
  .catch(error => {
    console.error(error);
    res.status(500).send('Error en la consulta');
  });
});


// Endpoint para obtener las coordenadas x y de un robot por su código
app.get('/api/robots/:code/coordinates', async (req, res) => {
  try {
    const { code } = req.params;

    // Buscar el robot por su código
    const robot = await Robot.findOne({ code });

    if (!robot) {
      return res.status(404).json({ error: 'Robot no encontrado' });
    }

    const { x, y } = robot.location;

    res.json({ x, y });
  } catch (error) {
    console.error('Error al obtener las coordenadas del robot:', error);
    res.status(500).json({ error: 'Ocurrió un error al procesar la solicitud' });
  }
});


// Endpoint para agregar un usuario
app.post('/api/users/:userId/:displayName', async (req, res) => {
  try {
    const { userId, displayName } = req.params;

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ userId });

    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    // Crear un nuevo usuario
    const newUser = new User({
      userId,
      displayName,
      robots: []
    });

    await newUser.save();

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error al agregar un usuario:', error);
    res.status(500).json({ error: 'Ocurrió un error al procesar la solicitud' });
  }
});

app.get('/api/robots/:code/waste', async (req, res) =>{

  try{

    const { code } = req.params;
    const robot = await Robot.findOne({ code });
  
    if (!robot) {
      res.sendStatus(401).json({error: "el robot no fue encontrado"});
    }
  
    const waste = robot.waste;
    res.json(waste);
  } catch(error) {
      console.error("error encontrando la basura ", error);
      res.status(500).json({ error: 'Ocurrió un error al procesar la solicitud' });
  }
 

});



app.post('/api/users/:userId/link/:code', async (req, res) => {
  try {
    const { userId, code } = req.params;

    const robot = await Robot.findOne({ code });
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(401).json({ error: "El usuario no existe" });
    }

    if (!robot) {
      return res.status(401).json({ error: "El robot no existe" });
    }

    // Agregar el nuevo robot al campo 'robots' del usuario
    await User.findOneAndUpdate(
      { userId },
      { $push: { robots: {code: code } } }
    );

    res.json({ message: "Robot agregado exitosamente al usuario" });
  } catch (error) {
    console.error(error);
    res.sendStatus(500).json({ error: "Ocurrió un error al procesar la solicitud" });
  }
});

module.exports = app;