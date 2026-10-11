module.exports = function (api) {
  api.cache(true);
  return {
    // zustand's ESM build references import.meta, which web bundles can't parse without this.
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
  };
};
