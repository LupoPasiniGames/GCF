/*
 * Generating data for charts is expensive, so this web worker does it on a separate thread
*/
let queue=[]
self.importScripts("gcf.js")
initGCF((res)=>{
    if(res){
        console.log("Worker started")
        self.onmessage=(req)=>{
            if(req.data.op==="clear"){
                queue=[]
            }else if(req.data.op==="chart"){
                queue.push(req)
            }
        }
    }else{
        console.log("Worker loading failed!")
    }
})
setInterval(()=>{
    while(queue.length>0){
        let req=queue.pop()
        let s=stocks[req.data.stock]
        let values=[]
        if(req.data.chartType==="value"){
            for(let i=req.data.start;i<req.data.end;i+=req.data.step){
                values.push({x:i*(1000*60*60*24),y:s.getValue(i)})
            }
            values.push({x:req.data.end*(1000*60*60*24),y:s.getValue(req.data.end)})
        }else if(req.data.chartType==="rsi"){
            for(let i=req.data.start;i<req.data.end;i+=req.data.step){
                values.push({x:i*(1000*60*60*24),y:s.getRelativeStrengthIndex(i)})
            }
            values.push({x:req.data.end*(1000*60*60*24),y:s.getRelativeStrengthIndex(req.data.end)})
        }
        postMessage({rid:req.data.rid,values:values})
    }
},100);
