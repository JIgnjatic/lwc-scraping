public with sharing class YahooFinanceScraping {

    //we have 2 givenDate params since yahoo historical requires 2 time points
    // the second param is +1 day due to Yahoo not rendering if they are the same
    @AuraEnabled
    public static List<YahooFinanceHTMLWrapper> scrapeHTML(List<String> tickers, String givenDateMiliseconds, String givenDateMilisecondsPlusOneDay) {

        System.debug('tickers: ' + tickers);

        List<YahooFinanceHTMLWrapper> yahooTickerWrapperList = new List<YahooFinanceHTMLWrapper>();

        for(String ticker : tickers){

            String stockUrl = 'https://finance.yahoo.com/quote/' + ticker+ '/history?period1='+ givenDateMiliseconds +'&period2='+ givenDateMilisecondsPlusOneDay +'&interval=1d&filter=history&frequency=1d&includeAdjustedClose=true';
            String companyUrl = 'https://finance.yahoo.com/quote/' + ticker+ '/profile?p=' + ticker;
            String marketCapUrl = 'https://finance.yahoo.com/quote/' + ticker+ '?p=' + ticker;

            System.debug('stockUrl: ' + stockUrl);

            List<String> urls = new List<String>{stockUrl, companyUrl, marketCapUrl};
    
            YahooFinanceHTMLWrapper yfw = YahooFinanceScrapingHelper.makeCallout(urls);
            yfw.ticker = ticker;
            yahooTickerWrapperList.add(yfw);

        }
        return yahooTickerWrapperList;
    }


    //todo:
    //perform duplicate checks prior to making callouts
    @AuraEnabled
    public static List<Stock_Data__c> verifyDuplicates(List<String> tickers, String givenDateStr){
        try {
            
            Date givenDate = Date.valueOf(givenDateStr);
            
            List<Stock_Data__c> stockData = YahooFinanceScrapingDAO.findScrapedData(tickers,givenDate);
            return stockData;
            
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
   

    @AuraEnabled
    public static List<YahooLWCResponse> insertStockData(String stockDataList){
        
        List<YahooLWCResponse> ywrList = (List<YahooLWCResponse>) JSON.deserialize(stockDataList, List<YahooLWCResponse>.class);
        List<Stock_Data__c> stockList = new List<Stock_Data__c>();

        for(YahooLWCResponse ywr : ywrList){


            Stock_Data__c sd = new Stock_Data__c();
            sd.Name = ywr.ticker + ' ' + ywr.givenDate;
            sd.Ticker_Symbol__c = ywr.ticker;
            sd.Date__c = Date.valueOf(ywr.givenDate);
            sd.Open_Price__c = Decimal.valueOf(ywr.openPrice);
            sd.Close_Price__c = Decimal.valueOf(ywr.closePrice);
            sd.Market_Cap__c = String.valueOf(ywr.marketCap);
            sd.Employee_Number__c = ywr.employeeNumber;
            sd.Company_Address__c = ywr.companyAddress;
            sd.Industry__c = ywr.industry;

            stockList.add(sd);
        }

        try {
            Database.SaveResult[] results = Database.insert(stockList, false);            

            //we use the same wrapper to send the info back
            return addInsertResultsToWrapper(results, ywrList);
        } catch (Exception e) {
            System.debug('Failed to insert stock data. Error: ' + e.getMessage());
            throw new AuraHandledException('Failed to insert stock data. Error: ' + e.getMessage());
        }
    }


    /////////
    //helper methods
    /////////
    private static List<YahooLWCResponse> addInsertResultsToWrapper(List<Database.SaveResult> results, List<YahooLWCResponse> yahooLWCResponses ){

        List<YahooLWCResponse> ylrList = new List<YahooLWCResponse>(yahooLWCResponses);

        for(Integer i=0; i<results.size(); i++){
            Database.SaveResult sr = results[i];
            if(sr.isSuccess()){
                ylrList[i].id = sr.getId();
            }else {
                Database.Error err = sr.getErrors()[0];
                ylrList[i].success = false;
                ylrList[i].errorMessage = err.getMessage();
            }
        }

        return ylrList;
    }


    
    public class YahooLWCResponse{
        @AuraEnabled
        public String ticker;
        @AuraEnabled
        public String givenDate;
        @AuraEnabled
        public String openPrice;
        @AuraEnabled
        public String closePrice;
        @AuraEnabled
        public String marketCap;
        @AuraEnabled
        public String employeeNumber;
        @AuraEnabled
        public String companyAddress;
        @AuraEnabled
        public String industry;
        @AuraEnabled
        public String name;
        @AuraEnabled
        public String id;
        @AuraEnabled 
        public Boolean success;
        @AuraEnabled
        public String errorMessage;
    }


    public class YahooFinanceHTMLWrapper {
        @AuraEnabled 
        public String ticker;
        @AuraEnabled
        public String stockData; 
        @AuraEnabled
        public String companyInfo; 
        @AuraEnabled
        public String marketCap; 
    }

}