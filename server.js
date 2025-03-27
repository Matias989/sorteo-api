const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const app = express();
const port = 3000;
const path = require("path");

app.use(express.static(path.join(__dirname, "public")));

app.use(bodyParser.json());

mongoose
mongoose.connect("mongodb+srv://raziel:155524400@sorteo.haag8qf.mongodb.net/sorteo?retryWrites=true&w=majority&appName=sorteo", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log("✅ Conectado a MongoDB");

    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error al conectar a MongoDB:", err);
  });

// Captura de errores no manejados
process.on("unhandledRejection", (reason, promise) => {
  console.error("🛑 Unhandled Rejection:", reason);
});

const userSchema = new mongoose.Schema({
  nickname: { type: String, required: true, unique: true },
  multiplier: { type: Number, default: 1 },
  isRegisteredForCurrentDraw: { type: Boolean, default: false },
});

const User = mongoose.model("User", userSchema);

app.post("/api/register", async (req, res) => {
  const nickname = req.body.nickname?.trim().toLowerCase();
  if (!nickname) return res.status(400).send("Nickname requerido");

  try {
    let user = await User.findOne({ nickname });
    if (!user) {
      user = new User({ nickname, isRegisteredForCurrentDraw: true });
    } else {
      user.isRegisteredForCurrentDraw = true;
    }
    await user.save();
    res.status(200).send("User registered successfully");
  } catch (error) {
    res.status(500).send("Error registering user");
  }
});

app.post("/api/draw", async (req, res) => {
  try {
    const participants = await User.find({ isRegisteredForCurrentDraw: true });

    if (participants.length === 0) {
      return res
        .status(400)
        .json({ message: "No hay usuarios registrados para el sorteo." });
    }

    // 🎫 Crear la bolsa de tickets
    const ticketBag = [];
    participants.forEach((user) => {
      const multiplier = parseFloat(user.multiplier.toString());
      const tickets = Math.max(1, Math.floor(multiplier)); // mínimo 1 ticket
      for (let i = 0; i < tickets; i++) {
        ticketBag.push(user);
      }
    });

    // 🎯 Elegir ganador
    const ganador = ticketBag[Math.floor(Math.random() * ticketBag.length)];

    // 📝 Actualizar cada usuario
    await Promise.all(
      participants.map(async (user) => {
        const esGanador = user.nickname === ganador.nickname;

        // Historial
        user.history = user.history || [];
        user.history.push({
          date: new Date(),
          result: esGanador ? "win" : "lose",
        });

        // Multiplicador
        const mult = parseFloat(user.multiplier.toString());
        user.multiplier = esGanador
          ? Math.max(1, mult * 0.5)
          : Math.min(10, mult + 0.5);

        //limpiar registro para el próximo sorteo
        user.isRegisteredForCurrentDraw = false;

        await user.save();
      })
    );

    res.json({ ganador: ganador.nickname });
  } catch (error) {
    console.error("❌ Error al ejecutar sorteo:", error);
    res.status(500).send("Error al ejecutar sorteo.");
  }
});

app.post("/api/reset-draw", async (req, res) => {
  try {
    const result = await User.updateMany(
      { isRegisteredForCurrentDraw: true },
      { $set: { isRegisteredForCurrentDraw: false } }
    );

    res.status(200).json({
      message: `✅ Se limpiaron ${result.modifiedCount} usuarios.`,
    });
  } catch (error) {
    console.error("❌ Error al resetear registros:", error);
    res.status(500).send("Error al resetear registros.");
  }
});

app.get("/api/participants", async (req, res) => {
  try {
    const participants = await User.find({
      isRegisteredForCurrentDraw: true,
    }).sort({ nickname: 1 });

    res.status(200).json(participants);
  } catch (error) {
    console.error("❌ Error al obtener participantes:", error);
    res.status(500).send("Error al obtener participantes.");
  }
});

app.get('/api/register', async (req, res) => {
  const nickname = req.query.nickname?.trim().toLowerCase();
  if (!nickname) return res.status(400).send('Nickname requerido');

  try {
    let user = await User.findOne({ nickname });
    if (!user) {
      user = new User({ nickname, isRegisteredForCurrentDraw: true });
    } else {
      user.isRegisteredForCurrentDraw = true;
    }
    await user.save();
    res.status(200).send(`🎉 ¡${nickname}, estás registrado!`);
  } catch (error) {
    res.status(500).send('Error al registrar usuario');
  }
});
