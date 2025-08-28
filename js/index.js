const { createApp } = Vue;

createApp({
    data() {
        return {
            selectedRegion: 'all', // 使用者選擇的區域
            cities: [],            // 城市天氣資料列表
            isLoading: true,       // 載入狀態
            error: null,           // 錯誤訊息
            // 地區對應表
            regionMap: {
                '基隆市': 'north',
                '臺北市': 'north',
                '新北市': 'north',
                '桃園市': 'north',
                '新竹縣': 'north',
                '新竹市': 'north',
                '苗栗縣': 'central',
                '臺中市': 'central',
                '彰化縣': 'central',
                '南投縣': 'central',
                '雲林縣': 'central',
                '嘉義市': 'south',
                '嘉義縣': 'south',
                '臺南市': 'south',
                '高雄市': 'south',
                '屏東縣': 'south',
                '宜蘭縣': 'east',
                '花蓮縣': 'east',
                '臺東縣': 'east',
                '澎湖縣': 'outlying',
                '金門縣': 'outlying',
                '連江縣': 'outlying',
            }
        }
    },
    computed: {
        filteredCities() {
            if (this.selectedRegion === 'all') {
                return this.cities;
            }
            return this.cities.filter(city => city.region === this.selectedRegion);
        }
    },
    methods: {
        async fetchWeatherData() {//向中央氣象署 API 取得天氣資料。
            try {
                this.isLoading = true;
                this.error = null;

                const response = await fetch('https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=CWA-A3A163B8-8FCF-47FC-9791-E645B466C33A');

                if (!response.ok) {
                    throw new Error('無法取得天氣資料');
                }

                const data = await response.json();
                this.processWeatherData(data);//成功後呼叫 processWeatherData 轉換成程式可用格式。

            } catch (error) {
                console.error('取得天氣資料錯誤:', error);
                this.error = error.message;
            } finally {
                this.isLoading = false;
            }
        },

        processWeatherData(data) {
            const locations = data.records.location;
            this.cities = locations.map(location => {
                console.log(location);
                const locationName = location.locationName;
                const weatherElements = location.weatherElement;

                // 取得各項天氣資訊
                const wx = weatherElements.find(el => el.elementName === 'Wx'); //天氣現象 (Wx)
                const pop = weatherElements.find(el => el.elementName === 'PoP');//降雨機率 (PoP)
                const minT = weatherElements.find(el => el.elementName === 'MinT');//最低溫 (MinT)
                const maxT = weatherElements.find(el => el.elementName === 'MaxT');//最高溫 (MaxT)
                const ci = weatherElements.find(el => el.elementName === 'CI');//舒適度 (CI)

                // 取得第一個時間段的資料（最近的預報）
                const condition = wx?.time[0]?.parameter?.parameterName || '晴天';
                const popValue = pop?.time[0]?.parameter?.parameterName || '0';
                const minTemp = minT?.time[0]?.parameter?.parameterName || '20';
                const maxTemp = maxT?.time[0]?.parameter?.parameterName || '30';
                const comfort = ci?.time[0]?.parameter?.parameterName || '舒適';

                // 計算平均溫度
                const avgTemp = Math.round((parseInt(minTemp) + parseInt(maxTemp)) / 2);

                return {
                    name: locationName,
                    region: this.regionMap[locationName] || 'other',
                    temperature: avgTemp,
                    condition: this.simplifyWeatherCondition(condition),
                    humidity: this.estimateHumidity(condition, popValue),
                    windSpeed: this.estimateWindSpeed(condition),
                    updateTime: new Date().toLocaleTimeString('zh-TW', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    rainProbability: popValue,
                    comfort: comfort,
                    minTemp: minTemp,
                    maxTemp: maxTemp
                };
            });
            // 按照 regionMap 中的順序排序
            const cityOrder = Object.keys(this.regionMap);
            this.cities.sort((a, b) => {
                const indexA = cityOrder.indexOf(a.name);
                const indexB = cityOrder.indexOf(b.name);

                // 如果城市在 regionMap 中找不到，放到最後
                if (indexA === -1 && indexB === -1) return 0;
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;

                return indexA - indexB;
            });
        },

        simplifyWeatherCondition(condition) {//將 API 複雜的天氣文字簡化
            if (condition.includes('雨') || condition.includes('雷') || condition.includes('陣雨')) {
                return '雨天';
            } else if (condition.includes('雲') || condition.includes('陰')) {
                return '多雲';
            } else if (condition.includes('晴') || condition.includes('高溫')) {
                return '晴天';
            }
            return '多雲';
        },

        estimateHumidity(condition, rainProbability) {
            // 根據天氣狀況和降雨機率估算濕度
            const baseHumidity = condition.includes('雨') ? 75 :
                condition.includes('雲') ? 65 : 55;
            const popAdjust = Math.floor(parseInt(rainProbability) * 0.2);
            return Math.min(95, baseHumidity + popAdjust + Math.floor(Math.random() * 10));
        },

        estimateWindSpeed(condition) {
            // 根據天氣狀況估算風速
            const baseSpeed = condition.includes('雨') ? 12 :
                condition.includes('雲') ? 8 : 6;
            return baseSpeed + Math.floor(Math.random() * 8);
        },

        getWeatherIcon(condition) {
            const iconMap = {
                '晴天': 'fas fa-sun',
                '多雲': 'fas fa-cloud',
                '雨天': 'fas fa-cloud-rain'
            };
            return iconMap[condition] || 'fas fa-sun';
        },

        getWeatherIconClass(condition) {
            const classMap = {
                '晴天': 'sunny',
                '多雲': 'cloudy',
                '雨天': 'rainy'
            };
            return classMap[condition] || 'sunny';
        },

        refreshWeather() {//重新抓取最新天氣資料。
            this.fetchWeatherData();
        }
    },

    mounted() {
        this.fetchWeatherData();
        // 每 30 分鐘更新一次資料
        setInterval(() => {
            this.fetchWeatherData();
        }, 30 * 60 * 1000);
    }
}).mount('#app');