import express from "express";
import joi from "joi";
import Todo from "../schemas/todo.schema.js";

const router = express.Router();

/*
1. value 데이터는 필수적으로 존재 해야한다.
2. value 데이터는 문자열 타입 이어야 한다.
3. value 데이터는 최소 1글자 이상이어야 한다.
4. value 데이터는 최대 50글자 이하여야 한다.
5. 유효성 검사에 실패했을 때, 에러가 발생해야 한다.
 // 위 뜻은 검증을 진행할때 비동기적으로 진행해야 한다.
*/
const createdTodoSchema = joi.object({
  value: joi.string().min(1).max(50).required(),
});

/**
 * 할일 등록 API
 */
router.post("/todos", async (req, res, next) => {
  try {
    // 1. 클라이언트로 부터 받아온 value 데이터를 가져온다.
    // const { value } = req.body;

    const validation = await createdTodoSchema.validateAsync(req.body);

    const { value } = validation;

    // 1-5. 만약, 클라이언트가 value 데이터를 전달하지 않았을 때, 클라이언트에게 에러 메시지를 전달한다.
    if (!value) {
      return res
        .status(400)
        .json({ errorMessage: "해야할 일(value) 데이터가 존재하지 않습니다." });
      // 클라이언트가 전달하지 않은것은 400
    }

    // 2. 해당하는 마지막 order 데이터를 조회한다.
    // findeOne = 1개의 데이터만 조회한다.
    // sort = 정령한다. -> 어떤 컬럼을?
    const todoMaxOrder = await Todo.findOne().sort("-order").exec();
    // order 만 하면 오름차순 -order 하면 내림차순
    // 몽구스로 조회할때는 exec 로 조회하면 좀더 정상적으로 조회할 수 있다.
    // exec()가 없으면 프로미스로 동작하지 않게 되며 프로미스로 동작하지 않는다는건
    // await 을 사용할 수 없다.

    // 3. 만약 존재한다면 현재 해야 할 일을 +1 하고, order 데이터가 존재하지 않다면, 1로 할당한다.
    const order = todoMaxOrder ? todoMaxOrder.order + 1 : 1;

    // 4. 해야할 일 등록
    const todo = new Todo({ value, order }); // todo 인스턴스 형식으로 만든것이고
    await todo.save(); // 데이터베이스에 저장한다.

    // 5. 해야할 일을 클라이언트에게 반환한다.
    return res.status(201).json({ todo: todo });
  } catch (error) {
    // 서버가 중단되지 않기위해 위를 try로 묶어주고 아래 catch 구문을 하여 에러메세지를 리스폰스 함으로 써 서버를 유지할 수 있다.
    // Router 다음에 있는 에러 처리 미들웨어를 실행한다.
    next(error);
  }
});

/* 해야할 일 목록 조회 API */

router.get("/todos", async (req, res, next) => {
  // 1. 해야할 일 목록 조회를 진행한다.
  const todos = await Todo.find().sort("-order").exec();

  // 2. 해야할 일 목록 조회 결과를 클라이언트에게 반환한다.
  return res.status(200).json({ todos });
});

/* 해야할 일 순서 변경, 완료 / 해제 API  */

router.patch("/todos/:todoId", async (req, res, next) => {
  const { todoId } = req.params;
  const { order, done, value } = req.body;

  // 현재 나의 order가 무엇인지 알아야한다.
  const currentTodo = await Todo.findById(todoId).exec();
  if (!currentTodo) {
    return res
      .status(404)
      .json({ errorMessage: "존재하지 않는 해야할 일 입니다." });
    // 조회가 되지 않은것은 404
  }

  if (order) {
    const targetTodo = await Todo.findOne({ order }).exec();
    if (targetTodo) {
      targetTodo.order = currentTodo.order;
      await targetTodo.save();
    }

    currentTodo.order = order;
  }
  if (done !== undefined) {
    currentTodo.doneAt = done ? new Date() : null;
    //new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}) 이렇게 작성하면 한국시간을 가져올수 있음.
  }
  if (value) {
    currentTodo.value = value;
  }

  await currentTodo.save();

  return res.status(200).json({});
});

// 할 일 삭제 API
router.delete("/todos/:todoId", async (req, res, next) => {
  const { todoId } = req.params;

  const todo = await Todo.findById(todoId).exec();
  if (!todo) {
    return res
      .status(404)
      .json({ errorMessage: "존재하지 않는 해야할 일 정보입니다." });
  }

  await Todo.deleteOne({ _id: todoId });

  return res.status(200).json({});
});

export default router;
