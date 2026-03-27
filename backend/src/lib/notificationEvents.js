import { EventEmitter } from 'events';

const notificationEvents = new EventEmitter();
notificationEvents.setMaxListeners(200);

export default notificationEvents;
