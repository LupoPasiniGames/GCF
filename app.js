const VERSION="v20240325a"

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
}
if(location.protocol=="http:"){
    location.href="https"+location.href.substring(4)
}
if (window.matchMedia('(display-mode: standalone)').matches) { //PWAs in standalone mode don't have the are you sure you want to leave the page dialog, so we prevent accidental back button presses on android from killing the app
    history.pushState({},null,document.URL)
    window.addEventListener('popstate', () => {
        history.pushState({},null,document.URL)
    })
}

function toSlide(id){
    document.querySelectorAll("div.slide").forEach(function(e){
        e.classList.remove("visible")
        e.classList.add("hidden")
        e.querySelectorAll("*").forEach(function(l){
            l.tabIndex=-1
        })
    })
    let e=document.getElementById(id)
    e.classList.add("visible")
    e.classList.remove("hidden")
    e.querySelectorAll("*").forEach(function(l){
        l.tabIndex=""
    })
}
function openDialogBox(onVisible){
    document.querySelectorAll("div.slide").forEach(function(e){
        e.querySelectorAll("*").forEach(function(l){
            l.tabIndex=-1
        })
    })
    dialogBox.classList.add("visible")
    dialogBox.classList.remove("hidden")
    dialogBox.ontransitionend=function(){
        dialogBox.ontransitionend=null
        if(typeof onVisible === "function") onVisible()
    }
    dialogBox.querySelectorAll("*").forEach(function(l){
        l.tabIndex=""
    })
}
function closeDialogBox(onHidden){
    document.querySelectorAll("div.slide.visible").forEach(function(e){
        e.querySelectorAll("*").forEach(function(l){
            l.tabIndex=""
        })
    })
    dialogBox.classList.remove("visible")
    dialogBox.classList.add("hidden")
    dialogBox.ontransitionend=function(){
        dialogBox.ontransitionend=null
        if(typeof onHidden === "function") onHidden()
    }
    dialogBox.querySelectorAll("*").forEach(function(l){
        l.tabIndex="-1"
    })
}
function showDialogBox(content,buttons,onVisible){
    dialogContent.innerHTML=""
    if(typeof content === "string"){
        dialogContent.innerText=content
    }else if(content.constructor===Array){
        content.forEach(function(e){
            dialogContent.appendChild(e)
        })
    }else{
        dialogContent.appendChild(content)
    }
    dialogButtons.innerHTML=""
    if(buttons){
        buttons.forEach(function(e){
            let b=document.createElement("button")
            b.innerText=e.text
            b.onclick=e.action
            dialogButtons.appendChild(b)
        })
    }else{
        let b=document.createElement("button")
        b.innerText="Ok"
        b.onclick=closeDialogBox
        dialogButtons.appendChild(b)
    }
    openDialogBox(onVisible)
}
function playSound(name){
    soundPlayer.src="sound/"+name
    soundPlayer.play()
}
function populateLeftBar(){
    myStocks.innerHTML=""
    allStocks.innerHTML=""
    for(let s in stocks){
        s=stocks[s]
        let e=document.createElement("div")
        e.stockId=s.id
        let d=null
        d=document.createElement("div")
        d.className="clickOverlay"
        d.onclick=function(){
            showDetails(s.id)
            document.querySelectorAll("#myStocks>div,#allStocks>div").forEach(function(s){
                s.className=""
            })
            e.className="selected"
        }.bind(this)
        e.appendChild(d)
        d=document.createElement("div")
        d.className="gainLoss"
        e.appendChild(d)
        d=document.createElement("div")
        d.className="name"
        d.innerText=s.id+" - "+s.name
        if(s.type==="ETF"){
            let b=document.createElement("span")
            b.className="badge"
            b.innerText="ETF"
            d.appendChild(b)
        }
        e.appendChild(d)
        d=document.createElement("div")
        d.className="stockPrice"
        e.appendChild(d)
        d=document.createElement("div")
        d.className="dailyVariation"
        e.appendChild(d)
        if(player&&player.purchased[s.id]){
            myStocks.appendChild(e)
        }else{
            allStocks.appendChild(e)
        }
    }
    if(myStocks.childNodes.length===0){
        myStocksTitle.style.display="none"
    }else{
        myStocksTitle.style.display="block"
    }
    updateLeftBar(true)
}
function updateLeftBar(updateAll){
    let elements=document.querySelectorAll("#myStocks>div,#allStocks>div")
    if(!updateAll){
        elements=[elements[~~(Math.random()*elements.length)]]
    }
    elements.forEach(function(s){
        if(s.stockId==stockDetails.current){
            s.className="selected"
        }else{
            s.className=""
        }
        s.querySelector(".stockPrice").innerText=stocks[s.stockId].getValue().toFixed(3)+" Kr"
        let e=s.querySelector(".dailyVariation")
        let v=stocks[s.stockId].getDailyVariation()
        if(v>0.1) e.className="dailyVariation positive super"
        else if(v>0) e.className="dailyVariation positive"
        else if(v<-0.1) e.className="dailyVariation negative super"
        else if(v<0) e.className="dailyVariation negative"
        else e.className="dailyVariation"
        e.innerText=(v>=0?"+":"")+(v*100).toFixed(2)+"%"
        if(player&&player.purchased[s.stockId]){
            e=s.querySelector(".gainLoss")
            v=player.purchased[s.stockId].getGainLoss()
            if(v>1) e.className="gainLoss positive super"
            else if(v>0) e.className="gainLoss positive"
            else if(v<-0.2) e.className="gainLoss negative super"
            else if(v<0) e.className="gainLoss negative"
            else e.className="gainLoss"
            e.innerText=(v>=0?"+":"")+(v*100).toFixed(2)+"%"
        }else{
            s.querySelector(".gainLoss").innerText=""
        }
    })
}
function minimizeLeftBar(){
    leftBar.className="minimized"
    openClose.onclick=expandLeftBar
    openClose.innerText=">"
}
function expandLeftBar(){
    leftBar.className="expanded"
    openClose.onclick=minimizeLeftBar
    openClose.innerText="<"
}
function showDetails(s){
    purgeChartDataGenerationQueue()
    s=stocks[s]
    let oldChart=stockDetailsInternal.querySelector("#stockChart")
    if(stockDetails.current&&oldChart.chartjs) oldChart.chartjs.destroy()
    stockDetails.current=s.id
    stockDetailsInternal.innerHTML=""
    let e, e2
    e=document.createElement("h1")
    e.innerText=s.name
    stockDetailsInternal.appendChild(e)
    e=document.createElement("div")
    e.className="stockPrice"
    e.innerText="..."
    stockDetailsInternal.appendChild(e)
    e=document.createElement("div")
    e.className="dailyVariation"
    e.innerText="..."
    stockDetailsInternal.appendChild(e)
    if(player&&player.purchased[s.id]){
        purchasedInfo.style.display="block"
        purchasedAmount.innerText=player.purchased[s.id].amount
        avgPrice.innerText=player.purchased[s.id].avgPrice.toFixed(3)+" Kr"
        document.getElementById("sell").style.display=""
        document.getElementById("allOut").style.display=""
    }else{
        purchasedInfo.style.display="none"
        document.getElementById("sell").style.display="none"
        document.getElementById("allOut").style.display="none"
    }
    e2=document.createElement("div")
    e2.id="stockChartContainer"
    e2.className="loading"
    e=document.createElement("canvas")
    e.className="chart"
    e.id="stockChart"
    e2.appendChild(e)
    stockDetailsInternal.appendChild(e2)
    if(s instanceof Stock){
        e2=document.createElement("div")
        e2.id="rsiChartContainer"
        e2.className="loading"
        e=document.createElement("canvas")
        e.className="chart"
        e.id="rsiChart"
        e2.appendChild(e)
        stockDetailsInternal.appendChild(e2)
    }
    controls.style.display="block"
    chartControls.style.display="block"
    ratings.style.display="block"
    transactionFees.style.display="block"
    commission.innerText=s.commission.toFixed(3)+" Kr"
    tax.innerText=(s.tax*100).toFixed(2)+"%"
    amount.value=""
    companyDescription.style.display="none"
    etfDetails.style.display="none"
    if(s.type==="stock"){
        companyDescription.style.display="block"
        companyDescriptionContent.innerText=s.description
    }else if(s.type==="ETF"){
        etfDetails.style.display="block"
        etfDescription.innerText=s.description
        etfComponents.innerHTML=""
        for(k in s.components){
            let tr=document.createElement("tr")
            let th=document.createElement("th")
            th.innerText=k
            tr.appendChild(th)
            let td=document.createElement("td")
            td.innerText=(100*s.components[k]/s._tot).toFixed(3)+"%"
            tr.appendChild(td)
            etfComponents.appendChild(tr)
        }
    }
    stockDetails.scrollTop=0
    updateDetails()
    updateDetailsCharts()
    updateRatings()
    minimizeLeftBar()
}
function updateDetails(){
    if(stockDetails.current){
        stockDetails.querySelector(".stockPrice").innerText=stocks[stockDetails.current].getValue().toFixed(3)+" Kr"
        let v=stocks[stockDetails.current].getDailyVariation()
        let e=stockDetails.querySelector(".dailyVariation")
        e.innerText=(v>=0?"+":"")+(v*100).toFixed(2)+"%"
        if(v>0.1) e.className="dailyVariation positive super"
        else if(v>0) e.className="dailyVariation positive"
        else if(v<-0.1) e.className="dailyVariation negative super"
        else if(v<0) e.className="dailyVariation negative"
        else e.className="dailyVariation"
        if(player&&player.purchased[stockDetails.current]){
            purchasedValue.innerText=player.purchased[stockDetails.current].getValue().toFixed(3)+" Kr"
            v=player.purchased[stockDetails.current].getProfit()
            profit.innerText=v.toFixed(3)+" Kr"
            eq=player.getEquity()
            if(v>eq*0.1) profit.className="dailyVariation positive super"
            else if(v>0) profit.className="dailyVariation positive"
            else if(v<-eq*0.1) profit.className="dailyVariation negative super"
            else if(v<0) profit.className="dailyVariation negative"
            else profit.className="dailyVariation"
            v=player.purchased[stockDetails.current].getGainLoss()
            gainLoss.innerText=v.toFixed(3)+" Kr"
            if(v>1) gainLoss.className="dailyVariation positive super"
            else if(v>0) gainLoss.className="dailyVariation positive"
            else if(v<-0.2) gainLoss.className="dailyVariation negative super"
            else if(v<0) gainLoss.className="dailyVariation negative"
            else gainLoss.className="dailyVariation"
            gainLoss.innerText=(v*100).toFixed(2)+"%"
        }
        //TODO: improve this garbage
        let btns=document.querySelectorAll("#chartControls>button")
        btns.forEach(function(e){e.className=""})
        if(chartDays===1){
            btns[0].className="selected";
        }else if(chartDays===7){
            btns[1].className="selected";
        }else if(chartDays===30){
            btns[2].className="selected";
        }else if(chartDays===365){
            btns[3].className="selected";
        }else if(chartDays===1825){
            btns[4].className="selected";
        }
    }
}
let chartDays=7
function updateDetailsCharts(){
    if(stockDetails.current){
        let s=stocks[stockDetails.current]
        let end=gameTimer()
        let start=end-chartDays
        let range=end-start
        let step=1
        if(range>=7){
            start=~~start
        }else{
            start=(~~(start*200))/200
        }
        if(range<7||range>=300){
            step=range/200
        }else if(range>=100){
            step=10
        }else if(range>=30){
            step=1
        }else if(range>=7){
            step=0.05
        }
        generateChartData(stockDetails.current,start,end,step,"value",function(values){
            let ctx=document.querySelector("#stockChart")
            if(!ctx.chartjs){
                let chart=new Chart(ctx,{
                    type:"line",
                    data:{
                        datasets:[{
                            label:s.name,
                            indexAxis:'x',
                            data:values,
                            borderWidth:1,
                            radius:0,
                        }]
                    },
                    options: {
                        animation:false,
                        parsing:false,
                        responsive:true,
                        maintainAspectRatio:false,
                        interaction: {
                            mode: 'nearest',
                            axis: 'x',
                            intersect: false
                        },
                        plugins: {
                            /*decimation: {
                                enabled: true,
                                samples:10
                            },*/
                            legend:{
                                display:false,
                            }
                        },
                        scales: {
                            x: {
                                type: 'time',
                                time:{
                                    unit:'day',
                                    displayFormats:{
                                        day:'yyyy-MM-dd'
                                    }
                                },
                                title:{
                                    display:true,
                                    text:'Data',
                                },
                            },
                            y:{
                                type:'linear',
                                title:{
                                    display:true,
                                    text:'Kr',
                                },
                                /*min:0,*/
                            }
                        },
                    }
                })
                ctx.chartjs=chart
            }else{
                ctx.chartjs.data.datasets[0].data=values
                ctx.chartjs.update()
            }
            document.querySelector("#stockChartContainer").className=""
        })
        if(s instanceof Stock){
            generateChartData(stockDetails.current,start,end,step,"rsi",function(rsivalues){
                let ctx=document.querySelector("#rsiChart")
                if(!ctx.chartjs){
                    let chart=new Chart(ctx,{
                        type:"line",
                        data:{
                            datasets:[{
                                label:s.name,
                                indexAxis:'x',
                                data:rsivalues,
                                borderWidth:1,
                                radius:0,
                            }]
                        },
                        options: {
                            animation:false,
                            parsing:false,
                            responsive:true,
                            maintainAspectRatio:false,
                            interaction: {
                                mode: 'nearest',
                                axis: 'x',
                                intersect: false
                            },
                            plugins: {
                                /*decimation: {
                                    enabled: true,
                                    samples:10
                                },*/
                                legend:{
                                    display:false,
                                }
                            },
                            scales: {
                                x: {
                                    type: 'time',
                                    display:false,
                                },
                                y:{
                                    type:'linear',
                                    title:{
                                        display:true,
                                        text:'Forza relativa',
                                    },
                                    min:0,
                                    max:100,
                                }
                            },
                        }
                    })
                    ctx.chartjs=chart
                }else{
                    ctx.chartjs.data.datasets[0].data=rsivalues
                    ctx.chartjs.update()
                }
                document.querySelector("#rsiChartContainer").className=""
            })
        }
    }
}
const chartDataGenWorker=new Worker("chartDataGenWorker.js")
let chartDataGenWorker_rid=0
let chartDataQueue=[]
chartDataGenWorker.onmessage=(e)=>{
    let listener=chartDataQueue[e.data.rid]
    if(!listener) return
    delete chartDataQueue[e.data.rid]
    listener.callback(e.data.values)
}
function generateChartData(stock,start,end,step,chartType,callback){
    let rid=chartDataGenWorker_rid++
    chartDataQueue[rid]={
        rid:rid,
        callback:callback
    }
    chartDataGenWorker.postMessage({
        op:"chart",
        rid:rid,
        stock:stock,
        start:start,
        end:end,
        step:step,
        chartType:chartType
    })
}
function purgeChartDataGenerationQueue(){
    chartDataQueue=[]
    chartDataGenWorker.postMessage({op:"clear"})
}
function updateRatings(){
    if(stockDetails.current){
        longTermInvestmentRating.innerText=krolikRating(stocks[stockDetails.current].getLongTermInvestmentRating())
        speculativeInvestmentRating.innerText=fitzgeraldRating(stocks[stockDetails.current].getSpeculativeInvestmentRating())
    }
}
function numberTo2Digits(n){
    if(n>=0&&n<10) return "0"+n; else return ""+n;
}
function rankToText(r){
    if(!player) return ""
    if(player.race=="Qüark"){
        switch(r){
            case -1: return "Bancarotta";
            case 0: return "Piccolo risparmiatore";
            case 1: return "Investitore";
            case 2: return "Consulente finanziario";
            case 3: return "Grande investitore";
            case 4: return "Capitalista di ventura";
            case 5: return "Banchiere";
            case 6: return "Agente della Gilda";
            case 7: return "Capogilda";
            case 8: return "Finanziere del Qüomq";
            case 9: return "Cavaliere dell'Erario";
            case 10: return "Presidente del Commercio";
            default: return "";
        }
    }else if(player.race=="Umano"){
        switch(r){
            case -1: return "Bancarotta";
            case 0: return "Piccolo risparmiatore";
            case 1: return "Investitore";
            case 2: return "Consulente finanziario";
            case 3: return "Grande investitore";
            case 4: return "Capitalista di ventura";
            case 5: return "Banchiere";
            case 6: return "Agente di Commercio";
            case 7: return "Finanziere";
            case 8: return "Agente corporativo";
            case 9: return "Presidente di corporazione";
            case 10: return "Grande Signore di Gaia";
            default: return "";
        }
    }else if(player.race=="Krentoriano"){
        switch(r){
            case -1: return "Bancarotta";
            case 0: return "Piccolo risparmiatore";
            case 1: return "Cercatore";
            case 2: return "Capofamiglia";
            case 3: return "Mercante";
            case 4: return "Mercante di frontiera";
            case 5: return "Consigliere";
            case 6: return "Mecenate";
            case 7: return "Legionario del mercato";
            case 8: return "Ambasciatore";
            case 9: return "Conte della Finanza";
            case 10: return "Araldo della Potenza Finanziaria";
            default: return "";
        }
    }else if(player.race=="Syviar"){
        switch(r){
            case -1: return "Imperatore decaduto";
            case 0: return "Piccolo risparmiatore";
            case 1: return "Apprendista del mercato";
            case 2: return "Capo degli schiavi";
            case 3: return "Mercante di schiavi";
            case 4: return "Parassita del mercato";
            case 5: return "Banchiere";
            case 6: return "Adepto dell'Accademia";
            case 7: return "Maestro";
            case 8: return "Guardiano";
            case 9: return "Alto Membro Eletto";
            case 10: return "Imperatore";
            default: return "";
        }
    }
}
function rankToEmoji(r){
    if(!player) return "";
    if(player.race=="Qüark"){
        switch(r){
            case -1: return "🔒";
            case 0: return "🌞";
            case 1: return "💴";
            case 2: return "💼";
            case 3: return "💰";
            case 4: return "🤑";
            case 5: return "🏦";
            case 6: return "🧑‍💼";
            case 7: return "👨‍💼";
            case 8: return "🪙";
            case 9: return "🕍";
            case 10: return "👑";
            default: return "";
        }
    }else if(player.race=="Umano"){
        switch(r){
            case -1: return "🔒";
            case 0: return "🌞";
            case 1: return "💴";
            case 2: return "💼";
            case 3: return "💰";
            case 4: return "🤑";
            case 5: return "🏦";
            case 6: return "🧑‍💼";
            case 7: return "👨‍💼";
            case 8: return "🪙";
            case 9: return "🕍";
            case 10: return "👑";
            default: return "";
        }
    }else if(player.race=="Krentoriano"){
        switch(r){
            case -1: return "🔒";
            case 0: return "🌞";
            case 1: return "💴";
            case 2: return "💼";
            case 3: return "💰";
            case 4: return "🤑";
            case 5: return "🏦";
            case 6: return "🧑‍💼";
            case 7: return "👨‍💼";
            case 8: return "🪙";
            case 9: return "🕍";
            case 10: return "👑";
            default: return "";
        }
    }else if(player.race=="Syviar"){
        switch(r){
            case -1: return "🔒";
            case 0: return "🌞";
            case 1: return "💴";
            case 2: return "💼";
            case 3: return "💰";
            case 4: return "🤑";
            case 5: return "🏦";
            case 6: return "🧑‍💼";
            case 7: return "👨‍💼";
            case 8: return "🪙";
            case 9: return "🕍";
            case 10: return "👑";
            default: return "";
        }
    }
}
function updateTopBar(){
    let date=gameTimerAsDate()
    currentDate.innerText=date.getFullYear()+"-"+numberTo2Digits(date.getMonth()+1)+"-"+numberTo2Digits(date.getDate())+" "+numberTo2Digits(date.getHours())+":"+numberTo2Digits(date.getMinutes())+":"+numberTo2Digits(date.getSeconds())
    if(player){
        let rank=player.getRank()
        playerName.innerText=player.username+" "+rankToEmoji(rank)
        playerRank.innerText=rankToText(rank)
        playerEquity.innerText=player.getEquity().toFixed(3)+" Kr"
        playerCredits.innerText=player.credits.toFixed(3)+" Kr"
    }
}
function buy(){
    if(!player) return
    if(Number(amount.value)<=0) return
    let price=Number(amount.value)*stocks[stockDetails.current].getValue()
    if(price+stocks[stockDetails.current].commission>player.credits){
        showDialogBox("Fondi insufficienti")
        return
    }
    let content=[]
    let e=document.createElement("p")
    e.innerText="Confermare l'acquisto di "+amount.value+" azioni di "+stockDetails.current+"?"
    content.push(e)
    e=document.createElement("p")
    e.innerHTML="<b>PREZZO</b>: "+price.toFixed(3)+" Kr<br>"+"<b>COMMISSIONI</b>: "+stocks[stockDetails.current].commission+" Kr"
    content.push(e)
    showDialogBox(content,[
        {
            text:"Conferma",
            action:function(){
                closeDialogBox(function(){
                    try{
                        if(player.buy(stockDetails.current,Number(amount.value))){
                            playSound("transaction.opus")
                            populateLeftBar()
                            showDetails(stockDetails.current)
                            leftBar.scrollTop=0
                            showDialogBox("Transazione eseguita")
                        }else{
                            showDialogBox("Transazione rifiutata, riprova più tardi")
                            amount.value=""
                        }
                    }catch(e){
                        showDialogBox("Transazione fallita, riprova più tardi")
                        amount.value=""
                    }
                })
            }
        },
        {
            text:"Annulla",
            action:closeDialogBox
        },
    ])
}
function sell(){
    if(!player) return
    if(Number(amount.value)<=0) return
    if(!player.purchased[stockDetails.current]){
        showDialogBox("Non puoi vendere azioni di un titolo che non hai in portfolio")
        return
    }
    if(Number(amount.value)>player.purchased[stockDetails.current].amount){
        showDialogBox("Non puoi vendere più azioni di quelle che hai in portfolio")
        return
    }
    let content=[]
    let e=document.createElement("p")
    e.innerText="Confermare la vendita di "+amount.value+" azioni di "+stockDetails.current+"?"
    content.push(e)
    e=document.createElement("p")
    let t=0
    let p=stocks[stockDetails.current].getValue()
    let recovered=p*Number(amount.value), paid=Number(amount.value)*player.purchased[stockDetails.current].avgPrice
    if(recovered>=paid){
        t=stocks[stockDetails.current].tax*(recovered-paid)
    }
    e.innerHTML="<b>PREZZO</b>: "+(Number(amount.value)*p).toFixed(3)+" Kr<br><b>COMMISSIONI</b>: "+stocks[stockDetails.current].commission.toFixed(3)+" Kr<br><b>TASSE</b>: "+t.toFixed(3)+" Kr"
    content.push(e)
    showDialogBox(content,[
        {
            text:"Conferma",
            action:function(){
                closeDialogBox(function(){
                    try{
                        if(player.sell(stockDetails.current,Number(amount.value))){
                            playSound("transaction.opus")
                            populateLeftBar()
                            showDetails(stockDetails.current)
                            leftBar.scrollTop=0
                            showDialogBox("Transazione eseguita")
                        }else{
                            showDialogBox("Transazione rifiutata, riprova più tardi")
                            amount.value=""
                        }
                    }catch(e){
                        showDialogBox("Transazione fallita, riprova più tardi")
                        amount.value=""
                    }
                })
            }
        },
        {
            text:"Annulla",
            action:closeDialogBox
        },
    ])
}
function allIn(){
    if(!player) return
    amount.value=~~((player.credits-stocks[stockDetails.current].commission*2)/stocks[stockDetails.current].getValue())
    if(amount.value>0) buy(); else amount.value=0
}
function allOut(){
    if(!player||!player.purchased[stockDetails.current]) return
    amount.value=player.purchased[stockDetails.current].amount
    if(amount.value>0) sell()
}
function createPlayer(){
    if(newPlayerName.value.trim()==""){
        showDialogBox("Il nome del giocatore non può essere vuoto")
        return
    }
    newGame(newPlayerName.value,25,newPlayerRace.value)
    populateLeftBar()
    updateTopBar()
    //TODO: finire il tutorial
    /*showDialogBox("Vuoi vedere il tutorial prima di cominciare?",[
        {
            text:"Si",
            action:function(){
                closeDialogBox()
                toSlide("tutorial1")
            }
        },
        {
            text:"No",
            action:function(){
                closeDialogBox()
                toSlide("trading")
            }
        }
    ])*/
    toSlide("trading")
}
function updateKrarlikEye(e){
    let x=-e.clientX/document.body.clientWidth
    let y=-e.clientY/document.body.clientWidth
    krarlik_eye.style.right=(x*0.375)+"rem"
    krarlik_eye.style.bottom=(y*0.175)+"rem"
}
function initApp(){
    document.body.removeChild(loadingOverlay)
    if(watermark){
        watermark.innerText+=" "+VERSION
    }
    let realInitFunction=function(){
        initGCF(function(success){
            if(success){
                if(loadGame()){
                    toSlide("trading")
                }else{
                    toSlide("intro")
                }
                populateLeftBar()
                updateTopBar()
                expandLeftBar()
                //the following intervals are intentionally off sync (except updateDetailsCharts because it's asynchronous) to reduce UI stuttering caused by all these events happening at the same time
                setInterval(updateTopBar,1000)
                setInterval(updateLeftBar,134)
                setInterval(updateDetails,1327)
                setInterval(updateDetailsCharts,10000)
                setInterval(updateRatings,54370)
                document.body.onmousemove=updateKrarlikEye
            }else{
                toSlide("connectionError")
            }
        })
    }
    let xhr=new XMLHttpRequest()
    xhr.onload=function(){
        if(xhr.responseText.trim()!=VERSION){
            console.log("Updating PWA")
            caches.delete("gcf").then(_=>{location.reload()}) //TODO: sometimes breaks on non-PWA
        }else realInitFunction()
    }
    xhr.onerror=function(){
        console.log("Update check failed")
        realInitFunction()
    }
    xhr.open("GET","version.txt?t="+Date.now())
    xhr.send()
}
function ac_punish(){
    player.credits=-1000000*Math.random()
    player.purchased=[]
    saveGame()
    alert("Ti sei dimenticato di pagare una rata del mutuo alla banca di Khàr-Khàr e ora i tuoi asset sono stati pignorati.")
    location.reload()
}
function onUnauthroizedLocalStorageChange(){
    ac_punish()
}
function onUnauthroizedPlayerObjectChange(){
    ac_punish()
}
function onSecondTabOpened(){
    player=null
    toSlide("noMultipleTabs")
    throw "stop"
}
function onTrap(){
    delete(localStorage.gcf)
    player=null
    alert("Hai violato le condizioni d'uso lecito e corretto del servizio. Il tuo conto è stato chiuso e i Krok donati in beneficienza.")
    location.reload()
}
