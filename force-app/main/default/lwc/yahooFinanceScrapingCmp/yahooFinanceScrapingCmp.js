import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import scrapeHTML from '@salesforce/apex/YahooFinanceScraping.scrapeHTML';
import insertStockData from '@salesforce/apex/YahooFinanceScraping.insertStockData';


import SCRAPED_DATA from '@salesforce/schema/Scraped_Data__c';
import TICKER_SYMBOL from '@salesforce/schema/Scraped_Data__c.Ticker_Symbol__c';


import { getPicklistValues } from 'lightning/uiObjectInfoApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';


export default class YahooFinanceScrapingCmp extends LightningElement {

	@track date = '2023-01-02';
	dateWithOneMoreDay = '2023-01-03';
	today = new Date().toISOString().slice(0,10);

	title = 'Yahoo Finance Scraping';
	@track ticker = '';
	returnResult;
	@track options;
	selectedTickerList = [];
	@track isLoading = false;

	stockDataList = [];

	@track showInputScreen = true;
	@track showScrapeResults = false;

	@track columns = [
		{ label: 'ID', fieldName: 'id', type: 'text' },
		{ label: 'Ticker', fieldName: 'ticker', type: 'text', innerWidth: 30 },
		{ label: 'Date', fieldName: 'givenDate', type: 'date', typeAttributes: { year: 'numeric', month: '2-digit', day: '2-digit' }, innerWidth: 30 },
		{ label: 'Open Price', fieldName: 'openPrice', type: 'number', innerWidth: 30 },
		{ label: 'Close Price', fieldName: 'closePrice', type: 'number', innerWidth: 30 },
		{ label: 'Market Cap', fieldName: 'marketCap', type: 'text', innerWidth: 30 },
		{ label: 'Error', fieldName: 'errorMessage', type: 'text'}
	];

	@track scrapedDataInsertResult = [];

	@wire(getObjectInfo, { objectApiName: SCRAPED_DATA })
	scrapedDataInfo;

	@wire(getPicklistValues, { recordTypeId: '$scrapedDataInfo.data.defaultRecordTypeId', fieldApiName: TICKER_SYMBOL })
	tickerPicklistValues({data, error}) {
		if(data) {

			this.options = data.values;

			this.options = this.options.map(item => {
				return {
					label: item.label,
					value: item.value
				}
			});
		}
		if(error) {
			console.log('error: ' + JSON.stringify(error));
			ShowToastEvent({
				title: 'Error',
				message: error.body.message,
				variant: 'error'
			});
		}
	}

	handleScrapeButtonClick() {

		console.log(this.selectedTickerList);

		if(this.selectedTickerList.length == 0){
			this.showErrorToast('Please select at least one ticker.');
			return;
		}

		let dateInMiliseconds = this.convertDateToMiliseconds(this.date)/1000;		
		let dateWithOneMoreDayInMiliseconds = this.convertDateToMiliseconds(this.dateWithOneMoreDay)/1000;

		this.isLoading = true;
		scrapeHTML({tickers: this.selectedTickerList, givenDateMiliseconds: dateInMiliseconds, givenDateMilisecondsPlusOneDay: dateWithOneMoreDayInMiliseconds})
			.then(result => {
				this.isLoading = false;
				this.returnResult = result;

				this.parseResult();
			})
			.catch(error => {
				this.isLoading = false;
				console.log('error: ' + error);
				console.log('error: ' + JSON.stringify(error));
				this.showErrorToast(error.body.message);
			});
    }

	handleInputScreenButtonClick(){
		this.isLoading = true;
		this.showInputScreen = true;
		this.showScrapeResults = false;
		this.isLoading = false;
	}

	//method to insert stock data
	insertStockData(){
		this.isLoading = true;
		insertStockData({stockDataList: JSON.stringify(this.stockDataList)})
			.then(result => {
				this.isLoading = false;
				this.showSuccessToast('Stock Data Inserted Successfully');
				this.scrapedDataInsertResult = result;
				this.stockDataList = [];
				this.showResults();
			})
			.catch(error => {
				this.isLoading = false;
				console.log('error: ' + error);
				console.log('error: ' + JSON.stringify(error));
				this.showErrorToast(error.body.message);
				this.stockDataList = [];
			});
	}

	//showcase the results using stockDataList through lightning-datatable
	showResults(){
		this.isLoading = true;
		this.showInputScreen = false;
		this.showScrapeResults = true;
		this.isLoading = false;
	}

	connectedCallback(){
		console.log('connectedCallback');

	}

	handleTickerSelection(event) {
		this.selectedTickerList = event.detail.value;
		console.log('selectedTickerList: ' + this.selectedTickerList);
	}


	handleDateChange(event) {
		this.date = event.target.value;
		//add one more day to the date
		let date = new Date(this.date);
		date.setDate(date.getDate() + 1);
		this.dateWithOneMoreDay = date.toISOString().slice(0,10);

		console.log('date+1: ' + this.dateWithOneMoreDay);

		//get the date in milliseconds
		let dateInMiliseconds = this.convertDateToMiliseconds(this.date);

		//check if the date is a weekend
		let isWeekend = this.isWeekend(dateInMiliseconds);
		
		//check if the date is a US holiday
		let isHoliday = this.isHoliday(dateInMiliseconds);

		console.log('isWeekend: ' + isWeekend);
		console.log('isHoliday: ' + isHoliday);


		if(isWeekend || isHoliday || this.date > this.today){
			event.target.setCustomValidity('Please select a valid date.');
			event.target.reportValidity();
		
			//reset the date
			this.date = null;
			this.dateWithOneMoreDay = null;
		}
	}
	

	//method to parse result
	parseResult(){
		for(let i = 0; i < this.returnResult.length; i++){

			console.log(i);

			let result = this.returnResult[i];

			let stockDataHtml = result.stockData;
			let companyInfoHtml = result.companyInfo;
			let marketCapHtml = result.marketCap;

			const parser = new DOMParser();
			const stockDataDoc = parser.parseFromString(stockDataHtml, 'text/html');
			const companyInfoDoc = parser.parseFromString(companyInfoHtml, 'text/html');
			const marketCapDoc = parser.parseFromString(marketCapHtml, 'text/html');

			let stockData = stockDataDoc.querySelector("section > div.Pb\\(10px\\).Ovx\\(a\\).W\\(100\\%\\) > table > tbody > tr:nth-child(1) > td.Py\\(10px\\).Ta\\(start\\).Pend\\(10px\\) > span");
			let openPrice = stockDataDoc.querySelector("section > div.Pb\\(10px\\).Ovx\\(a\\).W\\(100\\%\\) > table > tbody > tr:nth-child(1) > td:nth-child(2) > span");

			let closePrice = stockDataDoc.querySelector("section > div.Pb\\(10px\\).Ovx\\(a\\).W\\(100\\%\\) > table > tbody > tr:nth-child(1) > td:nth-child(5) > span");

			let employeeNumber = companyInfoDoc.querySelector("section > div.asset-profile-container > div > div > p.D\\(ib\\).Va\\(t\\) > span:nth-child(8) > span");

			let companyInfo = companyInfoDoc.querySelector("section > div.asset-profile-container > div > div > p.D\\(ib\\).W\\(47\\.727\\%\\).Pend\\(40px\\)");
			const companyAddress = this.parseCompanyInfo(companyInfo.innerHTML);

			let industry = companyInfoDoc.querySelector("section > div.asset-profile-container > div > div > p.D\\(ib\\).Va\\(t\\) > span:nth-child(5)");

			let marketCap = marketCapDoc.querySelector("#quote-summary > div.D\\(ib\\).W\\(1\\/2\\).Bxz\\(bb\\).Pstart\\(12px\\).Va\\(t\\).ie-7_D\\(i\\).ie-7_Pos\\(a\\).smartphone_D\\(b\\).smartphone_W\\(100\\%\\).smartphone_Pstart\\(0px\\).smartphone_BdB.smartphone_Bdc\\(\\$seperatorColor\\) > table > tbody > tr:nth-child(1) > td.Ta\\(end\\).Fw\\(600\\).Lh\\(14px\\)");

			this.stockDataList.push({
				"ticker": result.ticker,
				"givenDate": this.date,
				"openPrice": openPrice.innerHTML,
				"closePrice": closePrice.innerHTML,
				"marketCap": marketCap.innerHTML,
				"employeeNumber": employeeNumber.innerHTML,
				"companyAddress": companyAddress,
				"industry": industry.innerHTML
			});
		}

		this.insertStockData();

	}



	//
	// HELPER METHODS
	//


	parseCompanyInfo(companyInfo){

		const companyInfoString = companyInfo.toString();

		const addressRegex = /(.+)<br>([^<]+), ([A-Z]{2}) (\d{5}(?:-\d{4})?)<br>([^<]+)<br>/;
		const addressMatch = companyInfoString.match(addressRegex);

		const companyAddress = addressMatch[1] + ', ' + addressMatch[2] + ', ' + addressMatch[3] + ', ' + addressMatch[4] + ', ' + addressMatch[5];
		console.log('companyAddress: ' + companyAddress);

		return companyAddress;
	}


	//method to convert date to miliseconds
	convertDateToMiliseconds(date){
		return new Date(date).getTime();
	}

	showSuccessToast(message){
		this.dispatchEvent(
			new ShowToastEvent({
				title: 'Success',
				message: message,
				variant: 'success'
			})
		);
	}

	showErrorToast(message){
		this.dispatchEvent(
			new ShowToastEvent({
				title: 'Error',
				message: message,
				variant: 'error'
			})
		);
	}


	//isHoliday method
	isHoliday(dateInMiliseconds){
		let isHoliday = false;
		let holidays = [
			'1/1',
			'1/16',
			'2/20',
			'5/29',
			'7/4',
			'9/4',
			'9/10',
			'10/7',
			'11/23',
			'12/25'
		];
		
		let date = new Date(dateInMiliseconds);
		console.log('date: ' + date);
		let month = date.getMonth() + 1;
		let day = date.getDate();

		console.log('month: ' + month);
		console.log('day: ' + day);
		let dateString = month + '/' + day;


		if(holidays.includes(dateString)){
			isHoliday = true;
		}

		return isHoliday;
	}

	//isWeekend method
	isWeekend(dateInMiliseconds){
		let isWeekend = false;
		let date = new Date(dateInMiliseconds);
		let day = date.getDay();

		console.log('day: ' + day);

		if(day == 0 || day == 6){
			isWeekend = true;
		}

		return isWeekend;
	}


}