/**
 * @flow strict-local
 * @format
 */
// import generators
import fs from 'fs';
import path from 'path';
import { type SchemaType } from 'react-native-codegen/lib/CodegenSchema';
import generatorCpp from 'react-native-codegen/lib/generators/modules/GenerateModuleCpp.js';
import generatorH from 'react-native-codegen/lib/generators/modules/GenerateModuleH.js';
import generatorJavaSpec from 'react-native-codegen/lib/generators/modules/GenerateModuleJavaSpec.js';
import generatorJniCpp from 'react-native-codegen/lib/generators/modules/GenerateModuleJniCpp.js';
import generatorJniH from 'react-native-codegen/lib/generators/modules/GenerateModuleJniH.js';
// import parser
import parser from 'react-native-codegen/lib/parsers/flow/index.js';

export type GeneratorKindType = 'cpp' | 'h' | 'java' | 'jni_cpp' | 'jni_h';

// type taken from react-native-codegen(it's not exported)
type FilesOutput = Map<string, string>;

type GeneratorFunctionType = (string, SchemaType, string) => FilesOutput;

const generatorsMapping: {
  [key: string]: GeneratorFunctionType,
} = {
  cpp: generatorCpp.generate,
  h: generatorH.generate,
  java: generatorJavaSpec.generate,
  jni_cpp: generatorJniCpp.generate,
  jni_h: generatorJniH.generate,
};

export default function codeGen(
  libraryName: string,
  fileInPath: string,
  generators: $ReadOnlyArray<GeneratorKindType>,
  outputFolderPath: string,
) {
  // todo handle errors like invalid path, any failure in general
  const schema = parser.parseFile(fileInPath);
  // redundant for now - this is useful when it is desired
  // to write schema to a file, but here we don't do that
  // const serializedSchema =
  //   JSON.stringify(schema, null, 2).replace(/"/g, "'");

  // create out dir if it doesn't exist
  const fullOutDir = path.resolve(outputFolderPath);
  fs.mkdirSync(fullOutDir, { recursive: true });

  generators.forEach(generatorItem => {
    const generator = generatorsMapping[generatorItem];
    // the packageName(the last arg of `generate`) is optional
    // and only for java so can be omitted; todo - check it
    const generatedMap = generator(libraryName, schema, '');
    // loops through generated files
    generatedMap.forEach((contents, keyPath) => {
      console.log('generating', keyPath, '...');
      // create subdirectory if necessary
      const subDirArr = keyPath.split('/');
      if (subDirArr.length > 1) {
        let subDirToBeCreated = subDirArr.slice(0, -1).join('/');
        subDirToBeCreated = path.resolve(
          outputFolderPath + '/' + subDirToBeCreated,
        );
        fs.mkdirSync(subDirToBeCreated, { recursive: true });
      }
      // write file
      const generated = contents || '';
      const outPath = path.resolve(outputFolderPath + '/' + keyPath);
      fs.writeFileSync(outPath, generated, { flag: 'w+' });
      console.log('> saved to file', outPath);
    });
  });
}
