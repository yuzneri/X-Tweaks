/** CSS loaded through esbuild's text loader. The contents arrive as a string */
declare module '*.css' {
  const content: string;
  export default content;
}
