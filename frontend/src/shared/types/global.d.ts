/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare module '*.svg?react' {
  const content: React.FC<React.SVGProps<SVGElement>>
  export default content
}

declare type OptionalRecord<K extends keyof any, T> = {
  [P in K]?: T
}

declare type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>
    }
  : T
