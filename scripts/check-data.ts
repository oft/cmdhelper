import {loadContent,checkGeneratedSchemas} from './content-files.js';
try{await checkGeneratedSchemas();const {count}=await loadContent();console.log(`Validated ${count} content files, cross-file references and generated schemas.`);}
catch(error){console.error(error instanceof Error?error.message:error);process.exitCode=1;}
