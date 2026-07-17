import { setupToolExecution } from "./execute.js";

setupToolExecution({
  transform(context) {
    return context.file;
  },

  async serialize(file) {
    return file.text();
  },
});
