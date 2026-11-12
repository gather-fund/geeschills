import { Fragment } from 'react';
import { Asterisk } from './icons';
import { eventTypes } from '../lib/enquiry-options';

/** The blue strip listing the kinds of events GEES CHILLS caters for. */
export default function Occasions() {
  return <div className="occasions" aria-label="Events we cater for">{eventTypes.map((type, index) => <Fragment key={type}>{index > 0 && <span className="occasion-mark" aria-hidden="true"><Asterisk /></span>}<span>{type}</span></Fragment>)}</div>;
}
