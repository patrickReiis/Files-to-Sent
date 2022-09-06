import { dataSource } from './data-source';

dataSource
        .initialize()
        .then(() => {
                console.log('Data Source has been initialized');
        })
        .catch((err) => {
                console.log('Error during Data Source initialization:', err);
        })
export { dataSource }
