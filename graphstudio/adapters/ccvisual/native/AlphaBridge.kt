package studio.alpha

import com.google.gson.*
import dev.teutonstudio.ccvisual.graph.*
import dev.teutonstudio.ccvisual.project.LuaSource
import java.util.UUID
import org.squiddev.cobalt.LuaState
import org.squiddev.cobalt.LuaThread
import org.squiddev.cobalt.compiler.LoadState
import org.squiddev.cobalt.lib.CoreLibraries

/** Transport only. Graph semantics and Lua generation are the unmodified CCVisual sources. */
object AlphaBridge {
    private val gson = GsonBuilder().disableHtmlEscaping().serializeNulls().create()
    private val keywords = setOf("and", "break", "do", "else", "elseif", "end", "false", "for", "function", "goto", "if", "in", "local", "nil", "not", "or", "repeat", "return", "then", "true", "until", "while")
    private fun JsonObject.str(key: String, fallback: String = "") = get(key)?.takeUnless { it.isJsonNull }?.asString ?: fallback
    private fun JsonObject.array(key: String) = getAsJsonArray(key) ?: JsonArray()
    private fun identifier(value: String): String {
        require(value.matches(Regex("[a-zA-Z_][a-zA-Z_0-9]*")) && value !in keywords && !value.startsWith("__gs_")) { "Ungültiger Lua-Name: $value" }
        return value
    }
    private fun value(element: JsonElement): Any = when {
        element.isJsonNull -> ""
        element.isJsonObject -> element.asJsonObject.entrySet().associate { it.key to value(it.value) }
        element.isJsonArray -> element.asJsonArray.map(::value)
        element.asJsonPrimitive.isBoolean -> element.asBoolean
        element.asJsonPrimitive.isNumber -> element.asDouble.let { if (it.isFinite() && it == it.toInt().toDouble()) it.toInt() else it }
        else -> element.asString
    }
    private fun graph(input: JsonObject): NodeGraph {
        require(input.array("nodes").size() <= GraphValidator.MAX_NODES) { "Höchstens 2048 Knoten pro Karte" }
        fun ref(input: JsonObject) = PinRef(UUID.fromString(input.str("nodeId")), input.str("pinId"))
        val nodes = input.array("nodes").map { item ->
            val n = item.asJsonObject
            val pos = n.getAsJsonObject("position") ?: JsonObject()
            Node(UUID.fromString(n.str("id")), NodeTypeId(n.str("type")), Vec2(pos.get("x")?.asDouble ?: 0.0, pos.get("y")?.asDouble ?: 0.0),
                n.getAsJsonObject("params")?.entrySet()?.associate { it.key to value(it.value) }.orEmpty())
        }
        require(input.array("execConnections").size() <= GraphValidator.MAX_EDGES && input.array("dataConnections").size() <= GraphValidator.MAX_EDGES) { "Zu viele Verbindungen" }
        return NodeGraph(nodes,
            input.array("execConnections").map { it.asJsonObject.let { e -> ExecEdge(ref(e.getAsJsonObject("from")), ref(e.getAsJsonObject("to"))) } },
            input.array("dataConnections").map { it.asJsonObject.let { e -> DataEdge(ref(e.getAsJsonObject("from")), ref(e.getAsJsonObject("to"))) } })
    }
    private fun graphJson(g: NodeGraph): Any = mapOf("nodes" to g.nodes.map { mapOf("id" to it.id.toString(), "type" to it.type.value, "position" to it.position, "params" to it.params) }, "execConnections" to g.execConnections, "dataConnections" to g.dataConnections)
    private fun definition(d: NodeTypeDefinition): Any = mapOf(
        "id" to d.id.value, "title" to d.title, "category" to d.category, "documentation" to d.documentation, "defaultParams" to d.defaultParams,
        "pins" to d.pins.map { pin -> mapOf("id" to pin.id, "title" to pin.title, "direction" to pin.direction.name,
            "kind" to if (pin is ExecPin) pin.kind.name else "DATA", "dataType" to if (pin is DataPin) pin.dataType.name else null) })
    private fun sockets(input: JsonObject, key: String): List<FunctionSocket> = input.array(key).map {
        val s = it.asJsonObject
        FunctionSocket(s.str("id"), identifier(s.str("codeName")), s.str("displayName", s.str("codeName")), DataType.valueOf(s.str("dataType", "ANY")))
    }.also { require(it.size <= 32 && it.map { s -> s.id }.distinct().size == it.size && it.map { s -> s.codeName }.distinct().size == it.size) { "Doppelte oder zu viele Gruppenanschlüsse" } }
    private fun apiDefinitions(input: JsonArray): List<NodeTypeDefinition> = input.map { item ->
        val a = item.asJsonObject
        val method = identifier(a.str("method"))
        val id = a.str("id")
        require(id.matches(Regex("[a-z0-9_.]+")))
        NodeTypeDefinition(NodeTypeId("peripheral.alpha.$id.$method"), a.str("title"), a.str("category", "Pack-APIs"), buildList {
            add(ExecPin("in", "Eingang", PinDirection.INPUT)); add(DataPin("handle", "Gerät", PinDirection.INPUT, DataType.PERIPHERAL_HANDLE))
            a.array("parameters").forEach { p -> val s=p.asJsonObject; add(DataPin(identifier(s.str("id")), s.str("title",s.str("id")), PinDirection.INPUT, DataType.valueOf(s.str("type","ANY")))) }
            a.array("returns").forEach { p -> val s=p.asJsonObject; add(DataPin(identifier(s.str("id")), s.str("title",s.str("id")), PinDirection.OUTPUT, DataType.valueOf(s.str("type","ANY")))) }
            add(ExecPin("next", "Weiter", PinDirection.OUTPUT))
        }, "", a.str("documentation"), a.getAsJsonObject("defaults")?.entrySet()?.associate { it.key to value(it.value) }.orEmpty())
    }
    private fun registry(cards: List<FunctionCardDefinition>, apis: JsonArray) = NodeTypeRegistry(functionCards = cards).also { r -> apiDefinitions(apis).forEach(r::register) }
    private fun compile(project: JsonObject, apis: JsonArray): Any {
        require(project.get("schema")?.asInt == 1 && project.str("format") == "graphstudio.ccvisual.alpha") { "Unbekanntes Alpha-Projektformat" }
        val groups = project.array("groups").map { it.asJsonObject }
        require(groups.size <= 64) { "Höchstens 64 Gruppen" }
        val cards = groups.map { g -> FunctionCardDefinition(id=UUID.fromString(g.str("id")), path="main.lua", symbol="__gs_group_${g.str("id").replace("-","")}", displayName=g.str("name"), parameters=sockets(g,"parameters"), returns=sockets(g,"returns"), graph=graph(g.getAsJsonObject("graph"))) }
        require(cards.map { it.id }.distinct().size == cards.size) { "Doppelte Gruppen-ID" }
        require(cards.all { c -> c.parameters.none { it.codeName == "state" } && c.parameters.map { it.codeName }.intersect(c.returns.map { it.codeName }.toSet()).isEmpty() }) { "Parameter- und Rückgabenamen müssen verschieden sein; state ist reserviert" }
        val byId = cards.associateBy { it.id }
        val native = registry(cards, apis)
        val main = graph(project.getAsJsonObject("main"))
        require(main.nodes.size + cards.sumOf { it.graph.nodes.size } <= 8192) { "Höchstens 8192 Knoten im Alpha-Projekt" }
        val diagnostics = mutableListOf<Map<String,Any?>>()
        val resolved = linkedMapOf<String,Any>()
        for ((key,g) in listOf("main" to main) + cards.map { it.id.toString() to it.graph }) {
            GraphValidator.problems(g,native).forEach { diagnostics += mapOf("cardId" to key,"nodeId" to it.nodeId?.toString(),"message" to it.message) }
            g.nodes.forEach { n ->
                if(n.type.value=="snippet.call") diagnostics+=mapOf("cardId" to key,"nodeId" to n.id.toString(),"message" to "Snippetbibliotheken sind in dieser Alpha noch nicht angebunden; eine Knotengruppe verwenden")
                if(n.type.value.startsWith("peripheral.alpha.") || native.card(n)!=null) {
                    native.resolve(n)?.pins.orEmpty().filterIsInstance<DataPin>().filter { it.direction==PinDirection.INPUT }.forEach { p ->
                        val v=n.params[p.id]
                        val wired=g.dataConnections.any { it.to==PinRef(n.id,p.id) }
                        if(v!=null&&!wired) {
                            val valid=when(p.dataType) { DataType.NUMBER -> v is Number && v.toDouble().isFinite(); DataType.INTEGER -> v is Number && v.toDouble().isFinite() && v.toDouble()%1.0==0.0; DataType.STRING -> v is String; DataType.BOOLEAN -> v is Boolean; DataType.PERIPHERAL_HANDLE,DataType.TABLE,DataType.VECTOR,DataType.MATRIX -> false; else -> true }
                            if(!valid)diagnostics+=mapOf("cardId" to key,"nodeId" to n.id.toString(),"message" to "${p.title}: ${p.dataType} erwartet; Geräte und strukturierte Werte über Datenanschlüsse verbinden")
                        }
                    }
                }
            }
            resolved[key] = g.nodes.map { n -> mapOf("id" to n.id.toString(),"definition" to native.resolve(n)?.let(::definition)) }
            // A typed call must have an execution point, including otherwise unused calls.
            g.nodes.filter { native.card(it) != null && g.execConnections.none { e -> e.from.nodeId==it.id || e.to.nodeId==it.id } }.forEach {
                diagnostics += mapOf("cardId" to key,"nodeId" to it.id.toString(),"message" to "Gruppenaufruf an den Ablauf anschließen")
            }
        }
        val ordered = mutableListOf<FunctionCardDefinition>(); val active = hashSetOf<UUID>(); val seen=hashSetOf<UUID>()
        fun visit(c:FunctionCardDefinition) {
            if(c.id in seen) return
            require(active.add(c.id)) { "Zyklus zwischen Knotengruppen" }
            c.graph.nodes.mapNotNull(native::card).forEach(::visit)
            active.remove(c.id); seen.add(c.id);ordered+=c
        }
        cards.forEach(::visit)
        fun bind(g:NodeGraph): Pair<NodeGraph,String> {
            val declarations=mutableListOf<String>()
            val nodes=g.nodes.map { n -> val c=native.card(n)
                if(c==null) n else {
                    val symbol="__gs_instance_${n.id.toString().replace("-","")}"
                    declarations += "local $symbol = ${c.symbol}_create()"
                    n.copy(params=n.params+("callSymbol" to symbol))
                }
            }
            return g.copy(nodes=nodes) to declarations.joinToString("\n")
        }
        var lua:String?=null
        fun syntaxNode(g:NodeGraph):String? = g.nodes.firstOrNull { n ->
            n.type.value in setOf("raw.lua","raw.section") && LuaSource.syntaxError("return function(...) while true do\n${n.params["code"] ?: ""}\nend end","node.lua") != null
        }?.id?.toString()
        if(diagnostics.isEmpty()) {
            val definitions=ordered.joinToString("\n\n") { c ->
                val g=groups.first { UUID.fromString(it.str("id"))==c.id }
                val (bound,declarations)=bind(c.graph)
                val body=LuaCodeGenerator(native).generate(bound)
                val syntax=LuaSource.syntaxError("return function(${c.parameters.joinToString(", "){it.codeName}})\n$body\nend", "${c.displayName}.lua")
                if(syntax!=null) diagnostics+=mapOf("cardId" to c.id.toString(),"nodeId" to syntaxNode(c.graph),"message" to syntax)
                "local function ${c.symbol}_create()\n" + (if(g.get("stateful")?.asBoolean==true) "  local state = {}\n" else "") +
                    declarations.lineSequence().filter { it.isNotBlank() }.joinToString("") { "  $it\n" } +
                    "  return function(${c.parameters.joinToString(", "){it.codeName}})\n"+body.lineSequence().joinToString("\n") { "    $it" }+"\n  end\nend"
            }
            val (bound,declarations)=bind(main)
            val body=LuaCodeGenerator(native).generate(bound)
            val generated="-- Graphstudio Alpha · generated by the native CCVisual core\n"+definitions+"\n\n"+declarations+"\n"+body
            if(diagnostics.isEmpty()) LuaSource.syntaxError(generated,"main.lua")?.let { diagnostics+=mapOf("cardId" to "main","nodeId" to syntaxNode(main),"message" to it) }
            if(diagnostics.isEmpty()) lua=generated
        }
        return mapOf("valid" to diagnostics.isEmpty(),"lua" to lua,"diagnostics" to diagnostics,"resolved" to resolved,"groupCount" to byId.size,"engine" to "CCVisual JVM + Cobalt")
    }
    private fun dispatch(input:JsonObject):Any = when(input.str("op")) {
        "catalog" -> mapOf("definitions" to (NodeTypeRegistry().creatable().filterNot { it.id.value=="snippet.call" }+listOfNotNull(NodeTypeRegistry()[NodeTypeId("function.external")])+apiDefinitions(input.array("apis"))).map(::definition),"dataTypes" to DataType.entries.map{it.name},"limits" to mapOf("nodes" to GraphValidator.MAX_NODES,"edges" to GraphValidator.MAX_EDGES))
        "compile" -> compile(input.getAsJsonObject("project"),input.array("apis"))
        "parse" -> {
            val source=input.str("source");require(source.length<=200_000) { "Lua-Import ist auf 200000 Zeichen begrenzt" }
            val error=LuaSource.syntaxError(source,"import.lua")
            if(error==null) mapOf("graph" to graphJson(LuaGraphParser().parse(source)),"diagnostics" to emptyList<String>())
            else mapOf("graph" to graphJson(NodeGraph(listOf(Node(type=NodeTypeId("raw.lua"),params=mapOf("code" to source))))),"diagnostics" to listOf(error))
        }
        else -> error("Unbekannte Bridge-Aktion")
    }
    @JvmStatic fun main(args:Array<String>) {
        if(args.firstOrNull()=="--self-test") {
            val tests=JsonParser.parseString(System.`in`.bufferedReader().readText()).asJsonArray
            tests.forEach { test ->
                val t=test.asJsonObject
                val result=gson.toJsonTree(compile(t.getAsJsonObject("project"),t.array("apis"))).asJsonObject
                check(result.get("valid").asBoolean) { result.toString() }
                val state=LuaState();CoreLibraries.standardGlobals(state)
                val source=t.str("before")+"\n"+result.str("lua")+"\n"+t.str("after")
                LuaThread.runMain(state,LoadState.load(state,source.byteInputStream(),"@alpha-test",state.globals()))
                println("PASS ${t.str("name")}")
            }
            return
        }
        System.`in`.bufferedReader().lineSequence().forEach { line ->
            val result=try { mapOf("ok" to true,"result" to dispatch(JsonParser.parseString(line).asJsonObject)) }
                catch(e:Exception) { mapOf("ok" to false,"error" to (e.message?:e.javaClass.simpleName)) }
            println(gson.toJson(result));System.out.flush()
        }
    }
}
