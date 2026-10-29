from pathlib import Path
from io import BytesIO
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pypdf import PdfReader
cache=Path('.reference-cache');cache.mkdir(exist_ok=True)
sources={'A1':'https://www.goethe.de/pro/relaunch/prf/de/A1_SD1_Wortliste_02.pdf','A2':'https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_A2_Wortliste.pdf','B1':'https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_B1_Wortliste.pdf'}
def load(item):
 level,url=item
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
 data=urllib.request.urlopen(req,timeout=30).read()
 reader=PdfReader(BytesIO(data))
 text='\n'.join(p.extract_text(extraction_mode='layout') or '' for p in reader.pages)
 (cache/f'{level}.txt').write_text(text,encoding='utf-8')
 return level,len(reader.pages),len(text)
for result in ThreadPoolExecutor(max_workers=3).map(load,sources.items()):print(result)
