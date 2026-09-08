/**
 * Bun bundles a CSS import for its side effect — it collects the file into the
 * stylesheet and the module itself has no exports. TypeScript has no built-in
 * knowledge of that, so declare the shape here rather than reaching for `any`.
 */
declare module "*.css" {
    const content: string;
    export default content;
}
