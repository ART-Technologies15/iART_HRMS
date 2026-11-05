import Table from "./Table";
import CardList from "./MobileCardList";

/**
 * Drop-in replacement for <Table />. Renders the normal table at the `md`
 * breakpoint and above, and switches to a stacked-card layout (<CardList />)
 * below it — same `columns` and `data`, so no page code needs to change
 * beyond swapping the import.
 *
 * Extra props on top of Table's own (columns, data, loading, emptyText,
 * onRowClick):
 *  - titleKey?: string | false — forwarded to CardList, see CardList.jsx
 *  - actionsKey?: string | false — forwarded to CardList, see CardList.jsx
 */
const ResponsiveView = ({ titleKey, actionsKey, ...props }) => {
  return (
    <>
      <div className="hidden xl:flex xl:flex-col h-full overflow-hidden">
        <Table {...props} />
      </div>
      <div className="xl:hidden h-full overflow-y-auto">
        <CardList {...props} titleKey={titleKey} actionsKey={actionsKey} />
      </div>
    </>
  );
};

export default ResponsiveView;
