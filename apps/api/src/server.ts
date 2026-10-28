import cors from "cors";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 4000);
const app = createApp();
app.use(cors());

app.listen(port, () => {
  console.log(`Finance API listening on http://localhost:${port}`);
});
