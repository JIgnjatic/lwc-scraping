public with sharing class YahooFinanceScraping {
    @AuraEnabled
    public static List<YahooFinanceScraping.YahooFinanceHTMLWrapper> scrapeHTML(List<String> tickers, String givenDateMiliseconds, String givenDateMilisecondsPlusOneDay) {

        System.debug('tickers: ' + tickers);

        System.debug(givenDateMiliseconds);
        System.debug(givenDateMilisecondsPlusOneDay);

        List<YahooFinanceHTMLWrapper> yahooTickerWrapperList = new List<YahooFinanceHTMLWrapper>();

        
      
        for(String ticker : tickers){

            String stockUrl = 'https://finance.yahoo.com/quote/' + ticker+ '/history?period1='+ givenDateMiliseconds +'&period2='+ givenDateMilisecondsPlusOneDay +'&interval=1d&filter=history&frequency=1d&includeAdjustedClose=true';
            String companyUrl = 'https://finance.yahoo.com/quote/' + ticker+ '/profile?p=' + ticker;
            String marketCapUrl = 'https://finance.yahoo.com/quote/' + ticker+ '?p=' + ticker;

            System.debug('stockUrl: ' + stockUrl);

            List<String> urls = new List<String>{stockUrl, companyUrl, marketCapUrl};
    
            YahooFinanceHTMLWrapper yfw = makeCallout(urls);
            yfw.ticker = ticker;
            yahooTickerWrapperList.add(yfw);

        }
        return yahooTickerWrapperList;
    }

    private static YahooFinanceHTMLWrapper makeCallout(List<String> urls){

        YahooFinanceHTMLWrapper yfw = new YahooFinanceHTMLWrapper();
        HttpResponse response;


        for(Integer i=0; i<3; i++){

            try {

                HttpRequest request = new HttpRequest();
                Http http = new Http();

                request.setEndpoint(urls[i]);
                request.setMethod('GET');

                response = http.send(request);


                if (response.getStatusCode() == 200) {

                    if(i==0){
                        yfw.stockData = response.getBody();
                    }else if(i==1){
                        yfw.companyInfo = response.getBody();
                    }else if(i==2){
                        yfw.marketCap = response.getBody();
                    }
                } 

            } catch (Exception e) {
                throw new AuraHandledException('Failed to retrieve HTML. Status code: ' + response.getStatusCode() + ' Response: ' + response.getBody());
            }
        }

        return yfw;

    }

    //method to insert the stock data
   

    @AuraEnabled
    public static List<YahooLWCResponse> insertStockData(String stockDataList){
        
        System.debug('stockDataList: ' + stockDataList);

        List<YahooLWCResponse> ywrList = (List<YahooLWCResponse>) JSON.deserialize(stockDataList, List<YahooLWCResponse>.class);

        List<Scraped_Data__c> stockList = new List<Scraped_Data__c>();

        for(YahooLWCResponse ywr : ywrList){


            Scraped_Data__c sd = new Scraped_Data__c();
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
            Set<ID> stockIds = new Set<ID>();
            for(Integer i=0; i<results.size(); i++){
                Database.SaveResult sr = results[i];
                if(sr.isSuccess()){
                    ywrList[i].id = sr.getId();
                    stockIds.add(sr.getId());
                }else {
                    Database.Error err = sr.getErrors()[0];
                    ywrList[i].success = false;
                    ywrList[i].errorMessage = err.getMessage();
                }
            }

            return ywrList;
        

        } catch (Exception e) {
            System.debug('Failed to insert stock data. Error: ' + e.getMessage());
            throw new AuraHandledException('Failed to insert stock data. Error: ' + e.getMessage());
        }
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