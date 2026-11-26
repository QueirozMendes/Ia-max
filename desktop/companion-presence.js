export function keepCompanionVisible(win,{locked=false,displays=[]}={}){
 if(!win||win.isDestroyed()||locked)return false;
 if(win.isMinimized())win.restore();
 win.setAlwaysOnTop(true,'screen-saver');
 win.setSkipTaskbar(true);
 const bounds=win.getBounds();
 const visible=displays.some(({workArea:a})=>bounds.x<a.x+a.width&&bounds.x+bounds.width>a.x&&bounds.y<a.y+a.height&&bounds.y+bounds.height>a.y);
 if(displays.length&&!visible){const a=displays[0].workArea;win.setPosition(a.x+Math.max(0,a.width-bounds.width-20),a.y+Math.max(0,a.height-bounds.height-20));}
 if(!win.isVisible())win.showInactive();
 win.moveTop();
 return true;
}
