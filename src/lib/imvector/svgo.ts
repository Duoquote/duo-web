import { optimize } from "svgo";

const presetPlugins = {
  0: [], // No optimization
  1: [
    "removeDoctype",
    "removeXMLProcInst",
    "removeComments",
    "removeMetadata",
    "removeEditorsNSData",
    "cleanupAttrs",
    "mergeStyles",
    "minifyStyles",
    "removeUselessDefs",
    "cleanupNumericValues",
    "convertColors",
    "removeUnknownsAndDefaults",
    "removeNonInheritableGroupAttrs",
    "removeUselessStrokeAndFill",
    "cleanupEnableBackground",
    "removeHiddenElems",
    "removeEmptyText",
    "convertShapeToPath",
    "convertEllipseToCircle",
    "moveElemsAttrsToGroup",
    "collapseGroups",
    "convertPathData",
    "convertTransform",
    "removeEmptyAttrs",
    "removeEmptyContainers",
    "removeUnusedNS",
    "sortDefsChildren",
    "removeTitle",
    "removeDesc",
  ],
  2: [
    "removeDoctype",
    "removeXMLProcInst",
    "removeComments",
    "removeMetadata",
    "removeEditorsNSData",
    "cleanupAttrs",
    "mergeStyles",
    "minifyStyles",
    "removeUselessDefs",
    "cleanupNumericValues",
    "convertColors",
    "removeUnknownsAndDefaults",
    "removeNonInheritableGroupAttrs",
    "removeUselessStrokeAndFill",
    "cleanupEnableBackground",
    "removeHiddenElems",
    "removeEmptyText",
    "convertShapeToPath",
    "convertEllipseToCircle",
    "moveElemsAttrsToGroup",
    "moveGroupAttrsToElems",
    "collapseGroups",
    "convertPathData",
    "convertTransform",
    "removeEmptyAttrs",
    "removeEmptyContainers",
    "mergePaths",
    "removeUnusedNS",
    "sortDefsChildren",
    "removeTitle",
    "removeDesc",
    "removeDimensions",
  ],
} as const;

export function optimizeSvg(svgString: string, level: 0 | 1 | 2): string {
  if (level === 0) return svgString;

  const plugins = presetPlugins[level] as unknown as string[];

  try {
    const result = optimize(svgString, {
      multipass: level >= 2,
      plugins: [{ name: "preset-none" }, ...plugins.map((name) => ({ name }))],
    });
    return result.data;
  } catch {
    return svgString;
  }
}
