// Experimental independent parser: contiguous slices instead of per-character concatenation.
export function run(input) {
  const text = String(input.text), header = input.header === true;
  const errors=[], rows=[];
  let columns=null, width=-1;
  const n=text.length;
  let pos=text[0]==='\uFEFF'?1:0, line=1, recordLine=1, recordRow=null;
  const error=code=>errors.push({code,line:recordLine,row:recordRow});
  function readUnquoted(prefix='') {
    const parts=[];
    let start=pos, added=0;
    while(pos<n) {
      const c=text[pos];
      if(c===',') {
        parts.push(text.slice(start,pos));added+=pos-start;pos++;
        return {value:prefix+parts.join(''),ended:'comma',added};
      }
      if(c==='\n') {
        parts.push(text.slice(start,pos));added+=pos-start;pos++;line++;
        return {value:prefix+parts.join(''),ended:'line break',added};
      }
      if(c==='\r') {
        parts.push(text.slice(start,pos));added+=pos-start;
        if(text[pos+1]==='\n') {
          pos+=2;line++;return {value:prefix+parts.join(''),ended:'line break',added};
        }
        error('stray_cr');pos++;start=pos;continue;
      }
      pos++;
    }
    parts.push(text.slice(start,pos));added+=pos-start;
    return {value:prefix+parts.join(''),ended:'end',added};
  }
  function readQuoted() {
    const open=pos,openLine=line;
    let start=++pos,closed=false;
    const parts=[];
    while(pos<n) {
      const c=text[pos];
      if(c==='"') {
        parts.push(text.slice(start,pos));
        if(text[pos+1]==='"') {
          parts.push('"');pos+=2;start=pos;continue;
        }
        pos++;closed=true;break;
      }
      if(c==='\r') {
        parts.push(text.slice(start,pos));parts.push('\n');line++;
        pos+=text[pos+1]==='\n'?2:1;start=pos;continue;
      }
      if(c==='\n') {
        parts.push(text.slice(start,pos));parts.push('\n');line++;
        pos++;start=pos;continue;
      }
      pos++;
    }
    if(!closed) {
      pos=open+1;line=openLine;error('unterminated_quote');
      return readUnquoted('"');
    }
    const value=parts.join('');
    if(pos>=n)return {value,ended:'end'};
    const c=text[pos];
    if(c===','){pos++;return {value,ended:'comma'};}
    if(c==='\n'){pos++;line++;return {value,ended:'line break'};}
    if(c==='\r'&&text[pos+1]==='\n'){pos+=2;line++;return {value,ended:'line break'};}
    const rest=readUnquoted(value);
    if(rest.added>0)error('quote_junk');
    return rest;
  }
  while(true) {
    while(pos<n) {
      if(text[pos]==='\n'){pos++;line++;}
      else if(text[pos]==='\r'&&text[pos+1]==='\n'){pos+=2;line++;}
      else break;
    }
    if(pos>=n)break;
    recordLine=line;recordRow=header&&columns===null?null:rows.length;
    const fields=[];
    let field,quoted;
    do {
      quoted=text[pos]==='"';
      field=quoted?readQuoted():readUnquoted();
      fields.push(field.value);
    }while(field.ended==='comma');
    if(fields.length===1&&fields[0]===''&&!quoted)continue;
    if(width<0)width=fields.length;
    if(header&&columns===null){columns=fields;continue;}
    if(fields.length<width) {
      errors.push({code:'short_row',line:recordLine,row:recordRow,fields:fields.length});
      while(fields.length<width)fields.push('');
    }else if(fields.length>width){
      errors.push({code:'long_row',line:recordLine,row:recordRow,extra:fields.splice(width)});
    }
    rows.push(fields);
  }
  return {columns:header?(columns??[]):null,rows,errors};
}
