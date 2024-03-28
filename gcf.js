const INSIDE_WEB_WORKER=typeof importScripts==="function" //some parts of this script must not be loaded when inside a web worker
//mulberry32 seeded random number generator
function mulberry32(a) {
    return function() {
        let t=a+=0x6D2B79F5
        t=Math.imul(t^t>>>15,t|1)
        t^=t+Math.imul(t^t>>>7,t|61)
        return ((t^t>>>14)>>>0)/4294967296
    }
}
//game timer
const startDate=new Date("2127-01-01").getTime(), realStartDate=new Date("2023-12-23").getTime()
const speedup=20
//let _debug_tOffset=0
function gameTimer(){
    return new Date(startDate+(Date.now()-realStartDate)*speedup/*+_debug_tOffset*/)/(1000*60*60*24)
}
function gameTimerAsDate(t){
    if(typeof t === "undefined") t=gameTimer()
    return new Date(t*(1000*60*60*24))
}
//stock simulation
function Stock(id,name,description,baseValue,variability,volatility,noisiness,influenceability,commission,tax,seed){
    this.id=id
    this.name=name
    this.description=description
    this.type="stock"
    this._rng=mulberry32(seed)
    this._baseValue=baseValue
    this._variability=variability
    this._volatility=volatility
    this._noisiness=noisiness
    this._influenceability=influenceability
    this._baseF=volatility/100
    this._hAmplitude=[]
    this._hPhase=[]
    this._hfhAmplitude=[]
    this._hfhPhase=[]
    this._influenceability=influenceability
    this.commission=commission
    this.tax=tax
    for(let i=0;i<1024;i++){
        this._hAmplitude[i]=variability*(this._rng()*1000/(i*0.7+this._rng()*0.3))
        this._hPhase[i]=this._rng()*2*Math.PI
    }
    for(let i=0;i<1024;i++){
        this._hfhAmplitude[i]=noisiness*(this._rng()/(i*0.3+this._rng()*0.7))
        this._hfhPhase[i]=this._rng()*2*Math.PI
    }
    this._valueCache=[]
    /*this._cacheHits=0
    this._cacheMisses=0*/
}
const STOCKVALUECACHE_SIZE=1048576
Stock.prototype={
    constructor:Stock,
    getValue:function(t){
        if(typeof t === "undefined") t=gameTimer()
        t=Number(t).toFixed(5)
        let tIdx=(~~(t*100000))%STOCKVALUECACHE_SIZE
        if(this._valueCache[tIdx] && this._valueCache[tIdx].t===t){
            //this._cacheHits++
            return this._valueCache[tIdx].v
        }else{
            //this._cacheMisses++
        }
        let v=0
        for(let i=0;i<this._hAmplitude.length;i++){
            v+=this._hAmplitude[i]*Math.sin(this._baseF*t*i+this._hPhase[i])
        }
        for(let i=0;i<this._hfhAmplitude.length;i++){
            v+=this._hfhAmplitude[i]*Math.sin(this._baseF*1000*t*i+this._hfhPhase[i])
            v+=this._hfhAmplitude[i]*Math.sin(this._baseF*100000*t*i+this._hfhPhase[i])*0.2
        }
        v/=this._hAmplitude.length
        v++
        if(this._influenceability!=0) v*=(Math.pow(_masterStock.getValue(t),0.75)*this._influenceability)+1*(1-this._influenceability)
        if(v<0) v*=-1
        v*=this._baseValue
        if(v<0.1){
            v=Math.pow(Math.E,v-2.4)
        }
        v-=0.05
        v=v<0.001?0.001:v
        this._valueCache[tIdx]={t:t,v:v}
        return v
    },
    getDailyVariation:function(){
        let t=gameTimer()
        return (this.getValue(t)/this.getValue(t-1))-1
    },
    getRelativeStrengthIndex(t){
        //New algorithm using exponential moving average instead of regular average
        if(typeof t === "undefined") t=gameTimer()
        let gains,losses,v,p,dv,dg,dl
        for(let i=0;i<14;i++){
            v=this.getValue(t-i)
            p=this.getValue(t-i-1)
            dv=v/p-1
            if(dv>=0){
                dg=dv
                dl=0
            }else{
                dg=0
                dl=-dv
            }
            if(i>0){
                gains=dg*0.15+gains*0.85
                losses=dl*0.15+losses*0.85
            }else{
                gains=dg
                losses=dl
            }
        }
        if(losses==0) return 100
        return 100-(100/(1+(gains/losses)))
    },
    getLongTermInvestmentRating(){
        let score=0
        let n=Math.log(this._baseValue*0.05+1)
        score+=n>3?3:n
        n=Math.log(this._variability*1.5+1)
        score+=n>3?3:n
        n=0.2/this._volatility
        score+=n>2?2:n
        n=Math.log(Math.abs(this._influenceability)+1)
        score+=n>2?2:n
        score=Math.pow(Math.abs(score),0.9)
        score*=1-this.tax
        return score
    },
    getSpeculativeInvestmentRating(){
        let score=0
        let n=Math.log(this._variability+1)
        score+=n>2?2:n
        n=Math.log(this._volatility+1)
        score+=n>2?2:n
        n=Math.log(this._noisiness+1)
        score+=n>2?2:n
        let min=9999999,max=0
        let t=~~(gameTimer()/10)*10
        for(let i=0;i<365;i+=10){
            let v=this.getValue(t-i)
            if(v<min) min=v
            if(v>max) max=v
        }
        score+=(max-min)/min
        score=Math.pow(Math.abs(score),1.1)
        score*=1-this.tax
        return score
    }
}
function ETF(id,name,description,components,commission,tax){
    this.id=id
    this.name=name
    this.description=description
    this.type="ETF"
    this.components=components
    this.commission=commission
    this.tax=tax
    this._tot=0
    for(k in components){
        this._tot+=components[k]
    }
}
ETF.prototype={
    constructor:ETF,
    getValue:function(t){
        let tot=0
        for(k in this.components){
            tot+=stocks[k].getValue(t)*this.components[k]
        }
        tot/=this._tot
        return tot
    },
    getDailyVariation:function(){
        let t=gameTimer()
        return (this.getValue(t)/this.getValue(t-1))-1
    },
    getLongTermInvestmentRating(){
        let tot=0
        for(k in this.components){
            tot+=stocks[k].getLongTermInvestmentRating()*this.components[k]
        }
        tot/=this._tot
        return tot
    },
    getSpeculativeInvestmentRating(){
        let tot=0
        for(k in this.components){
            tot+=stocks[k].getSpeculativeInvestmentRating()*this.components[k]
        }
        tot/=this._tot
        return tot
    }
}
//the hidden master stock by which all stocks are influenced
const _masterStock=new Stock("","","",1,10,0.002,0,0,0,0,437)
//available stocks that can be purchased by the user (loaded from stocks.json)
let stocks=null
//useful functions to convert the values returned by getLongTermInvestmentRating and getSpeculativeInvestmentRating to human-readable forms
function krolikRating(score){
    score=(score*20).toFixed(0)
    score=score>100?100:score<1?1:score
    return score+"-"+String.fromCharCode(69-Math.round(score/25))
}
function fitzgeraldRating(score){
    if(score<1) return "F"
    if(score>=1&&score<1.5) return "D"
    if(score>=1.5&&score<2) return "C"
    if(score>=2&&score<2.25) return "BBB"
    if(score>=2.25&&score<2.5) return "BB"
    if(score>=2.5&&score<2.75) return "B"
    if(score>=2.75&&score<3) return "B+"
    if(score>=3&&score<3.5) return "A--"
    if(score>=3.5&&score<3.75) return "A-"
    if(score>=3.75&&score<4) return "A"
    if(score>=4&&score<4.5) return "A+"
    if(score>=4.5&&score<5) return "A++"
    if(score>=5) return "S"
}
//user's portfolio simulation
function Portfolio(username,initialCredits,race){
    this.credits=initialCredits
    this.username=username
    this.race=race
    this.purchased={}
}
Portfolio.prototype={
    constructor:Portfolio,
    buy:function(stock,amount){
        if(typeof stock === "string") stock=stocks[stock]
        if(amount<=0||!Number.isInteger(amount)) throw "Invalid amount"
        let stockPrice=stock.getValue()
        let price=stockPrice*amount+stock.commission
        if(price>this.credits) throw "Can't afford it"
        let dv=Math.abs(stock.getDailyVariation())+amount*0.000025
        let r=this.getRank()
        dv/=(r*r*0.25+1)
        if(dv>0.1){
            dv=Math.pow(dv>1?1:dv,0.25)
            if(Math.random()<dv) return false
        }
        ac_expectChange=true
        this.credits-=price
        if(this.purchased[stock.id]){
            let s=this.purchased[stock.id]
            s.avgPrice=(s.amount/(s.amount+amount))*s.avgPrice+(amount/(s.amount+amount))*stockPrice
            s.amount+=amount
        }else{
            this.purchased[stock.id]=new PortfolioEntry(stock.id,amount,stockPrice)
        }
        saveGame()
        return true
    },
    sell:function(stock,amount){
        if(typeof stock === "string") stock=stocks[stock]
        if(!this.purchased[stock.id]) throw "Not in portfolio"
        if(amount<=0||!Number.isInteger(amount)) throw "Invalid amount"
        let s=this.purchased[stock.id]
        if(amount>s.amount) throw "Not enough stock"
        let recovered=stock.getValue()*amount, paid=s.avgPrice*amount
        if(recovered>=paid){ //user gained money on this stock, apply tax
            recovered-=stock.tax*(recovered-paid)
        }
        recovered-=stock.commission
        if(this.credits+recovered<0) throw "Can't afford it"
        let dv=Math.abs(stock.getDailyVariation())+amount*0.000025
        let r=this.getRank()
        dv/=(r*r*0.25+1)
        if(dv>0.1){
            dv=Math.pow(dv>1?1:dv,0.15)
            if(Math.random()<dv) return false
        }
        if(amount==s.amount){
            delete(this.purchased[stock.id])
        }else{
            s.amount-=amount
        }
        ac_expectChange=true
        this.credits+=recovered
        saveGame()
        return true
    },
    getEquity:function(){
        let tot=this.credits
        for(let s in this.purchased){
            tot+=this.purchased[s].getValue()
        }
        return tot
    },
    getRank:function(){
        let e=this.getEquity()
        if(e<=0) return -1
        else if(e<100) return 0
        else if(e<300) return 1
        else if(e<700) return 2
        else if(e<1500) return 3
        else if(e<5000) return 4
        else if(e<15000) return 5
        else if(e<50000) return 6
        else if(e<100000) return 7
        else if(e<1000000) return 8
        else if(e<10000000) return 9
        else return 10
    }
}
function PortfolioEntry(stock,amount,avgPrice){
    this.stock=stock
    this.amount=amount
    this.avgPrice=avgPrice
}
PortfolioEntry.prototype={
    constructor:PortfolioEntry,
    getValue:function(){
        return this.amount*stocks[this.stock].getValue()
    },
    getGainLoss:function(){
        return (this.getValue()/(this.avgPrice*this.amount))-1
    },
    getProfit:function(){
        return this.getValue()-this.avgPrice*this.amount
    }
}
function loadPortfolioFromJSON(json){
    json=JSON.parse(json)
    let p=new Portfolio(json.username,Number(json.credits),json.race)
    for(s in json.purchased){
        s=json.purchased[s]
        if(!stocks[s.stock]) continue //portfolio contains stocks from a company that no longer exists, don't load it
        p.purchased[s.stock]=new PortfolioEntry(s.stock,Number(s.amount),Number(s.avgPrice))
    }
    return p
}
//load/save profile
let player=null
function newGame(name,credits,race){
    if(INSIDE_WEB_WORKER) return
    if(typeof name === "undefined") name="Player"
    if(typeof credits === "undefined") credits=10000
    if(typeof race === "undefined") race="Developer"
    ac_expectChange=true
    player=new Portfolio(name,credits,race)
    saveGame()
}
function loadGame(){
    if(INSIDE_WEB_WORKER) return
    if(typeof localStorage.gcf !== "undefined"){
        try{
            ac_expectChange=true
            player=loadPortfolioFromJSON(localStorage.gcf)
            return true
        }catch(e){
            console.log("Failed to load user portfolio: "+e)
            return false
        }
    }else{
        return false
    }
}
function saveGame(){
    if(INSIDE_WEB_WORKER) return
    if(player){
        localStorage.gcf=JSON.stringify(player)
        return true
    }else{
        console.log("saveGame was called but there's nothing to save")
        return false
    }
}
function initGCF(callback){
    let x=new XMLHttpRequest()
    x.onload=function(){
        try{
            let data=JSON.parse(x.responseText)
            stocks={}
            for(id in data){
                let s=data[id]
                if(s.type==="stock"){
                    stocks[id]=new Stock(id,s.name,s.description,s.params[0],s.params[1],s.params[2],s.params[3],s.params[4],Number(s.commission),Number(s.tax),s.params[5])
                }else if(s.type==="ETF"){
                    stocks[id]=new ETF(id,s.name,s.description,s.components,Number(s.commission),Number(s.tax))
                }else{
                    throw "Unknown stock type \""+s.type+"\""
                }
            }
        }catch(e){
            stocks=null
            console.log("Failed to parse stocks: "+e)
            if(callback) callback(true)
        }
        if(callback) callback(true)
    }
    x.onerror=function(){
        console.log("Failed to load stocks")
        if(callback) callback(false)
    }
    x.open("GET","stocks.json")
    x.send()
}
//unauthorized localStorage/player manipulation detection
let ac_oldSave=null, ac_expectChange=true, ac_oldPlayer=null, ac_nonce=~~(Math.random()*1000000), anticheat_enabled=true, cheats_enabled=false
if(!INSIDE_WEB_WORKER) localStorage.gcf_acN=ac_nonce
function ac_loop(){
    if(INSIDE_WEB_WORKER) return
    if(anticheat_enabled===false||cheats_enabled===true){
        if(typeof onTrap === "function") onTrap()
    }else if(localStorage.gcf_acN!=ac_nonce){
        if(typeof onSecondTabOpened === "function") onSecondTabOpened()
    }else if(localStorage.gcf){
        if(!ac_expectChange){
            if(localStorage.gcf!=ac_oldSave){
                if(typeof onUnauthroizedLocalStorageChange === "function") onUnauthroizedLocalStorageChange()
            }
            if(ac_oldPlayer!=JSON.stringify(player)){
                if(typeof onUnauthroizedPlayerObjectChange === "function") onUnauthroizedPlayerObjectChange()
            }
        }
        ac_oldSave=localStorage.gcf
        ac_oldPlayer=JSON.stringify(player)
        ac_expectChange=false
    }
    requestAnimationFrame(ac_loop)
}
ac_loop()
