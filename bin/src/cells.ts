
export default function ( program, action_context, auto_help ) {
    const subprogram			= program
	.command("cells")
	.description("Manage cells")
	.action( auto_help );

    subprogram
	.command("list")
	.description("List cells")
	.action(
	    action_context(async function ({ log, admin }) {
		const opts		= this.opts();
		const cells		= await admin.listCells();

		return cells;
	    })
	);

    return subprogram;
}
