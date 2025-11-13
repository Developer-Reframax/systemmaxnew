const fs = require('fs');
const path = require('path');

// Função para encontrar todos os arquivos .tsx recursivamente
function findTsxFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(findTsxFiles(filePath));
    } else if (file.endsWith('.tsx')) {
      results.push(filePath);
    }
  });
  
  return results;
}

// Função para corrigir localStorage em um arquivo
function fixLocalStorageInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Verificar se o arquivo contém localStorage.getItem sem a proteção SSR
  const hasUnprotectedLocalStorage = content.includes('localStorage.getItem') && 
    !content.includes("typeof window !== 'undefined' ? localStorage.getItem");
  
  if (!hasUnprotectedLocalStorage) {
    return false;
  }
  
  console.log(`Corrigindo: ${filePath}`);
  
  // Substituir todas as ocorrências de localStorage.getItem
  let newContent = content.replace(
    /localStorage\.getItem\(([^)]+)\)/g,
    "typeof window !== 'undefined' ? localStorage.getItem($1) : null"
  );
  
  // Escrever o arquivo corrigido
  fs.writeFileSync(filePath, newContent, 'utf8');
  return true;
}

// Executar a correção
const srcDir = path.join(__dirname, 'src', 'app');
const tsxFiles = findTsxFiles(srcDir);

let fixedCount = 0;
tsxFiles.forEach(file => {
  if (fixLocalStorageInFile(file)) {
    fixedCount++;
  }
});

console.log(`\nCorrigidos ${fixedCount} arquivos com problemas de localStorage.`);