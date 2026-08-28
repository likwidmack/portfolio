const PRETTIER_GLOB = /\.(js|jsx|mjs|cjs|ts|tsx|vue|json|md|yml|yaml|css|scss|html|pug)$/i;

export default {
  "*": (files) => {
    const forPrettier = files.filter((f) => PRETTIER_GLOB.test(f));
    if (!forPrettier.length) {
      return ['node -e "process.exit(0)"'];
    }
    return [`prettier --write ${forPrettier.map((f) => `"${f}"`).join(" ")}`];
  },
};
