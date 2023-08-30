module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
    sourceType: "module",
  },
  plugins: [ 
    "prettier"
  ],
  extends: [
    "plugin:@typescript-eslint/recommended", // recommended rules from the @typescript-eslint/eslint-plugin
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_(.+)?" },
    ],
    "@typescript-eslint/no-non-null-assertion": 0
  },

};
