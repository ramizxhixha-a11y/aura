module.exports=function fnSrc(src,name){const re=new RegExp('(^|\\n)(async )?function '+name+'\\s*\\(');const m=re.exec(src);if(!m)throw new Error('absent '+name);const start=m.index+m[1].length,st=[];
 for(let i=src.indexOf('{',src.indexOf(')',start));i<src.length;i++){const c=src[i],n2=src[i+1],top=st[st.length-1];
  if(top==='t'){if(c==='\\'){i++;continue}if(c==='`'){st.pop();continue}if(c==='$'&&n2==='{'){st.push('x');i++}continue}
  if(c==='/'&&n2==='/'){i=src.indexOf('\n',i);continue}if(c==='/'&&n2==='*'){i=src.indexOf('*/',i)+1;continue}
  if(c==='"'||c==="'"){i++;while(i<src.length&&src[i]!==c){if(src[i]==='\\')i++;i++}continue}
  if(c==='`'){st.push('t');continue}if(c==='{'){st.push('b');continue}if(c==='}'){st.pop();if(!st.length)return src.slice(start,i+1)}}};
