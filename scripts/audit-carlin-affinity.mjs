import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { applyCarlinEnrichment, initialCarlinProfile, typeOptions, subgenreOptions, themeOptions, preferenceOptions, budgetOptions, carlinQuestionSequence, recommendCarlinBooks, carlinAffinity } from '../supabase/functions/_shared/carlin.ts';
// El inventario completo sigue en work/; solo publica estadísticas agregadas.
const entries = JSON.parse(readFileSync('work/curation/selected.json','utf8'));
const books = applyCarlinEnrichment(entries.map(item=>item.book),entries.map(item=>({book_id:item.book.id,metadata:item.metadata})));
const baselinePath = process.argv[2];
const baseline = baselinePath ? await import(new URL(`../${baselinePath.replaceAll('\\','/')}`,import.meta.url)) : null;
const ageCoverage = [0,5,8,12,16,30,80].map(age=> {
  const profile = {...initialCarlinProfile,recipient:'self',age,type:'any',subgenre:'any',theme:'any',pace:'any',difficulty:'any',length:'any',budget:'any'};
  return {age,eligible:typeOptions(books,profile)[0].count,under20:budgetOptions(books,profile).find(option=>option.value===20)?.count??0};
});
const histogram = new Map();
const oldHistogram = new Map();
const modelPercentages = [];
const baselinePercentages = [];
let profiles = 0;
let fullSelections = 0;
let lowCoverage = 0;
let reordered = 0;
let questionMinimum = Infinity;
let questionMaximum = 0;
for (const age of [5,8,12,16,30]) {
  const start = {...initialCarlinProfile,recipient:'self',age,theme:'any',pace:'any',difficulty:'any',length:'any',budget:'any'};
  for (const path of typeOptions(books,start)) {
    const pathProfile = {...start,type:path.value};
    const genres = subgenreOptions(books,pathProfile);
    const genreSamples = [genres[0],...(genres.length>1?[genres[1]]:[])];
    for (const genre of genreSamples) {
      const genreProfile = {...pathProfile,subgenre:genre.value};
      const themes = themeOptions(books,genreProfile);
      const themeSamples = [...new Map([themes[0],themes[1],themes.at(-1)].filter(Boolean).map(theme=>[theme.value,theme])).values()];
      for (const theme of themeSamples) {
        for (const budget of [20,'any']) {
          for (const length of ['short','long']) {
            const chosen = {...genreProfile,theme:theme.value,budget,length};
            const paces = preferenceOptions(books,chosen,'pace');
            const levels = preferenceOptions(books,chosen,'difficulty');
            chosen.pace = paces.length>2 ? paces[length==='short'?1:paces.length-1].value : 'any';
            chosen.difficulty = levels.length>2 ? levels[length==='short'?1:levels.length-1].value : 'any';
            const context = {seed:`audit-${profiles}`};
            const result = recommendCarlinBooks(books,chosen,context);
            const possible = ageCoverage.find(item=>item.age===age)[budget===20?'under20':'eligible'];
            assert.equal(result.length,Math.min(3,possible));
            assert.ok(result.every(item=>budget==='any'||item.book.price<=budget));
            assert.equal(new Set(result.map(item=>item.book.id)).size,result.length);
            const count = carlinQuestionSequence(books,chosen).length;
            questionMinimum=Math.min(questionMinimum,count);
            questionMaximum=Math.max(questionMaximum,count);
            fullSelections += result.length===3?1:0;
            lowCoverage += result.filter(item=>item.affinity?.percent<50).length;
            for (const item of result) {
              assert.equal(item.affinity?.percent,carlinAffinity(books.find(book=>book.id===item.book.id),chosen)?.percent);
              if (item.affinity) {
                assert.ok(item.affinity.percent>0&&item.affinity.percent<100);
                histogram.set(item.affinity.percent,(histogram.get(item.affinity.percent)??0)+1);
                modelPercentages.push(item.affinity.percent);
              }
            }
            if (baseline) {
              const previous = baseline.recommendCarlinBooks(books,chosen,context);
              if (previous.map(item=>item.book.id).join(',')!==result.map(item=>item.book.id).join(',')) reordered++;
              for (const item of previous) if (item.affinity) {
                oldHistogram.set(item.affinity.percent,(oldHistogram.get(item.affinity.percent)??0)+1);
                baselinePercentages.push(item.affinity.percent);
              }
            }
            profiles++;
          }
        }
      }
    }
  }
}
const summarize = (values,hist) => ({samples:values.length,distinctPercentages:hist.size,min:Math.min(...values),max:Math.max(...values),mean:Math.round(100*values.reduce((sum,value)=>sum+value,0)/values.length)/100,exact100:hist.get(100)??0,exact50:hist.get(50)??0,histogram:Object.fromEntries([...hist].sort((a,b)=>a[0]-b[0]))});
const counts = field=>Object.fromEntries([...new Set(books.map(book=>book[field]))].sort((a,b)=>String(a).localeCompare(String(b),'es')).map(value=>[value,books.filter(book=>book[field]===value).length]));
const report = {date:'2026-10-04',activeCuratedBooks:books.length,genres:counts('subgenre'),audiences:counts('audience'),pace:counts('pace'),difficulty:counts('difficulty'),descriptions:books.filter(book=>book.description).length,covers:books.filter(book=>book.coverUrl).length,pages:books.filter(book=>book.pageCount).length,ageCoverage,profiles,fullSelections,lowCoverageRecommendations:lowCoverage,changedSelections:baseline?reordered:undefined,questionCount:{min:questionMinimum,max:questionMaximum},model:summarize(modelPercentages,histogram),baseline:baseline?summarize(baselinePercentages,oldHistogram):undefined,validation:'Pruebas sintéticas de consistencia sobre el catálogo privado; no validación de satisfacción de lectores.'};
writeFileSync('docs/carlin-affinity-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,genres:undefined,audiences:undefined,pace:undefined,difficulty:undefined,model:{...report.model,histogram:undefined},baseline:report.baseline?{...report.baseline,histogram:undefined}:undefined},null,2));
